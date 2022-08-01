use anchor_lang::prelude::*;
use anchor_lang::system_program::{Transfer, transfer};
use crate::nft_grab::{ESCROW_SOL_SEED, PARTY_PDA_SEED};

declare_id!("FteJ8GhF78qjo4acX7LmXi9RwzBcDnUax4FoB6xsMNA9");

#[program]
pub mod nft_grab {
    use super::*;

    pub const PARTY_PDA_SEED: &[u8] = b"party";
    pub const ESCROW_SOL_SEED: &[u8] = b"escrow_sol";
    // 0.1 SOL
    pub const SOL_PER_SHARE: u64 = 100_000_000;
    // Fund Max = SOL_PER_SHARE * MAX_TARGET_SHARES
    // = 100_000_000 SOLs
    // < u64::max_value
    pub const MAX_TARGET_SHARES: u64 = 1_000_000_000;
    // min share for participant
    pub const MIN_SHARE: u64 = 1;

    pub fn initialize(
        ctx: Context<Initialize>
    ) -> Result<()> {
        // start from #1
        ctx.accounts.global.next_id = 1;
        ctx.accounts.global.initializer = ctx.accounts.initializer.key();

        Ok(())
    }

    pub fn create_party(
        ctx: Context<CreateParty>,
        cap: u8,
        target: u64,
    ) -> Result<()> {
        ctx.accounts.party.cap = cap;
        ctx.accounts.party.state = State::CrowdFunding;
        ctx.accounts.party.target = target;
        ctx.accounts.party.creator = ctx.accounts.creator.key();
        ctx.accounts.party.participants = Vec::with_capacity(cap as usize);

        // msg: <pid> <creator> <cap> <target>
        msg!(
            "NFTGRAB | create_party: {} {} {} {}",
            ctx.accounts.global.next_id,
            ctx.accounts.creator.key(),
            cap,
            target
        );

        // update for next id
        ctx.accounts.global.next_id();

        Ok(())
    }

    pub fn participate(
        ctx: Context<Participate>,
        pid: u64,
        shares: u64,
    ) -> Result<()> {
        // 1. check
        let participant = ctx.accounts.participant.key();
        let actual_shares = Participate::check(&ctx, shares)?;

        // 2. transfer user's SOL to party account.
        Participate::transfer(&ctx, actual_shares * SOL_PER_SHARE)?;

        // 3. update party participants
        Participate::update_participant(ctx, actual_shares);

        // msg: <pid> <participant> <shares> <actual_shares>
        msg!(
            "NFTGRAB | participate: {} {} {} {}",
            pid,
            participant,
            shares,
            actual_shares
        );

        Ok(())
    }

    pub fn dissolve(
        ctx: Context<Dissolve>,
        pid: u64,
    ) -> Result<()> {
        ctx.accounts.party.state = State::Dissolving;

        Dissolve::translate_shares_to_balance(
            &mut ctx.accounts.party,
            &ctx.accounts.escrow_sol
        )?;

        // msg: <pid>
        msg!("NFTGRAB | dissolve: {}", pid);

        Ok(())
    }

    pub fn quit(
        ctx: Context<Quit>,
        pid: u64,
    ) -> Result<()> {
        // 1. transfer SOL from party to participant
        Quit::refund(&ctx, pid)?;

        // 2. delete the participant record
        Quit::sanitize(
            &mut ctx.accounts.party,
            ctx.accounts.participant.key(),
        )?;

        // 3. set Dissolved
        if ctx.accounts.party.participants.is_empty() {
            ctx.accounts.party.state = State::Dissolved;
        }

        // msg: <pid> <participant>
        msg!(
            "NFTGRAB | quit: {} {}",
            pid,
            ctx.accounts.participant.key()
        );

        Ok(())
    }

    pub fn close(
        _ctx: Context<Close>,
        pid: u64,
    ) -> Result<()> {
        // msg: <pid>
        msg!("NFTGRAB | close: {}", pid);

        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub initializer: Signer<'info>,
    #[account(
        init,
        payer = initializer,
        seeds = [PARTY_PDA_SEED],
        bump,
        space = 8 + Global::LEN
    )]
    pub global: Account<'info, Global>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(capacity: u8, target: u64)]
pub struct CreateParty<'info> {
    #[account(mut)]
    pub creator: Signer<'info>,
    #[account(mut)]
    pub global: Account<'info, Global>,
    #[account(
        init,
        payer = creator,
        seeds = [PARTY_PDA_SEED, global.to_bytes().as_ref()],
        bump,
        space = Party::space(capacity),
        constraint = capacity > 0 @ ErrorCode::InvalidCapacity,
        constraint = target > 0 && target <= MAX_TARGET_SHARES @ ErrorCode::InvalidTarget
    )]
    pub party: Account<'info, Party>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(pid: u64, shares: u64)]
pub struct Participate<'info> {
    #[account(mut)]
    pub participant: Signer<'info>,
    #[account(
        mut,
        seeds = [PARTY_PDA_SEED, pid.to_le_bytes().as_ref()],
        bump,
        constraint = shares >= MIN_SHARE @ ErrorCode::InvalidShares,
        constraint = party.remaining_shares() > 0 @ ErrorCode::CompleteTargetShares,
        constraint = party.participants.len() < party.cap as usize @ ErrorCode::PartyFull,
        constraint = party.state == State::CrowdFunding @ ErrorCode::BanParticipate,
    )]
    pub party: Account<'info, Party>,
    #[account(
        mut,
        seeds = [PARTY_PDA_SEED, pid.to_le_bytes().as_ref(), ESCROW_SOL_SEED],
        bump,
        constraint = Party::escrow_sol(pid).0 == *escrow_sol.key
    )]
    /// CHECK: This is not dangerous because we don't read or write from this account
    pub escrow_sol: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
}

impl<'info> Participate<'info> {
    fn check(
        ctx: &Context<Self>,
        shares: u64,
    ) -> anchor_lang::Result<u64> {
        let remaining_shares = ctx.accounts.party.remaining_shares();
        let actual_shares = if shares > remaining_shares {
            remaining_shares
        } else {
            shares
        };

        if ctx.accounts.participant.lamports() < actual_shares * nft_grab::SOL_PER_SHARE {
            return Err(ErrorCode::InsufficientFunds.into());
        }

        // actual_shares > 0 because of constraint checks
        Ok(actual_shares)
    }

    fn transfer(
        ctx: &Context<Self>,
        actual_balance: u64,
    ) -> anchor_lang::Result<()> {
        let cpi_accounts = Transfer {
            from: ctx.accounts.participant.to_account_info(),
            to: ctx.accounts.escrow_sol.to_account_info(),
        };
        let cpi_program = ctx.accounts.system_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);

        transfer(cpi_ctx, actual_balance)
    }

    fn update_participant(
        ctx: Context<Self>,
        actual_shares: u64,
    ) {
        if let Some(exist) = ctx
            .accounts
            .party
            .participants
            .iter_mut()
            .find(|item| item.account == ctx.accounts.participant.key())
        {
            exist.shares_or_balance += actual_shares
        } else {
            ctx
                .accounts
                .party
                .participants
                .push(Item {
                    account: ctx.accounts.participant.key(),
                    shares_or_balance: actual_shares,
                })
        }
    }
}

#[derive(Accounts)]
#[instruction(pid: u64)]
pub struct Dissolve<'info> {
    pub operator: Signer<'info>,
    #[account(
        mut,
        seeds = [PARTY_PDA_SEED, pid.to_le_bytes().as_ref()],
        bump,
        constraint = party.can_dissolve(operator.key()) @ ErrorCode::BanDissolve,
    )]
    pub party: Account<'info, Party>,
    #[account(
        seeds = [PARTY_PDA_SEED, pid.to_le_bytes().as_ref(), ESCROW_SOL_SEED],
        bump,
        constraint = Party::escrow_sol(pid).0 == *escrow_sol.key
    )]
    /// CHECK: This is not dangerous because we don't read or write from this account
    pub escrow_sol: AccountInfo<'info>,
}

impl<'info> Dissolve<'info> {
    fn translate_shares_to_balance(
        party: &mut Account<'info, Party>,
        escrowl_sol: &AccountInfo<'info>,
    ) -> anchor_lang::Result<()> {
        let total_balance = escrowl_sol.lamports();

        let actual_total_shares = party
            .participants
            .iter()
            .fold(0, |acc, item| acc + item.shares_or_balance);

        party.translate(total_balance, actual_total_shares);

        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(pid: u64)]
pub struct Quit<'info> {
    pub operator: Signer<'info>,
    #[account(mut)]
    /// CHECK: This is not dangerous because we don't read or write from this account data
    pub participant: UncheckedAccount<'info>,
    #[account(
        mut,
        seeds = [PARTY_PDA_SEED, pid.to_le_bytes().as_ref()],
        bump,
        constraint = party.can_quit(participant.key()) @ ErrorCode::BanQuit,
    )]
    pub party: Account<'info, Party>,
    #[account(
        mut,
        seeds = [PARTY_PDA_SEED, pid.to_le_bytes().as_ref(), ESCROW_SOL_SEED],
        bump,
        constraint = Party::escrow_sol(pid).0 == *escrow_sol.key
    )]
    /// CHECK: This is not dangerous because we don't read or write from this account
    pub escrow_sol: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
}

impl<'info> Quit<'info> {
    fn refund(
        ctx: &Context<Self>,
        pid: u64,
    ) -> anchor_lang::Result<()> {
        let participant = ctx.accounts.participant.to_account_info();

        if let Some(Item { account: _account, shares_or_balance: balance }) = ctx
            .accounts
            .party
            .participants
            .iter().find(|e| e.account == participant.key())
        {
            let cpi_accounts = Transfer {
                from: ctx.accounts.escrow_sol.to_account_info(),
                to: participant,
            };
            let cpi_program = ctx.accounts.system_program.to_account_info();

            let bump = Party::escrow_sol(pid).1;

            transfer(
                CpiContext::new_with_signer(
                    cpi_program,
                    cpi_accounts,
                    &[&[
                        PARTY_PDA_SEED,
                        pid.to_le_bytes().as_ref(),
                        ESCROW_SOL_SEED,
                        &[bump][..],
                    ][..]]
                ),
                *balance
            )?;
        }

        Ok(())
    }

    fn sanitize(
        party: &mut Account<'info, Party>,
        participant: Pubkey,
    ) -> anchor_lang::Result<()> {
        party
            .participants
            .retain(|e| e.account != participant);

        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(pid: u64)]
pub struct Close<'info> {
    #[account(mut)]
    pub operator: Signer<'info>,
    #[account(
        mut,
        seeds = [PARTY_PDA_SEED, pid.to_le_bytes().as_ref()],
        bump,
        constraint = party.can_close(operator.key()) @ ErrorCode::BanClose,
        close = operator
    )]
    pub party: Account<'info, Party>,
}

#[account]
pub struct Global {
    pub initializer: Pubkey,
    pub next_id: u64,
}

impl Global {
    pub const LEN: usize = 32 + 8;

    fn next_id(&mut self) {
        self.next_id += 1
    }

    fn to_bytes(&self) -> [u8; 8] {
        self.next_id.to_le_bytes()
    }
}

#[account]
pub struct Party {
    // Max members of Party
    pub cap: u8,
    // Party state
    pub state: State,
    // target total shares
    pub target: u64,
    // creator of Party
    pub creator: Pubkey,
    // TODO: implement
    pub escrow_nft: Pubkey,
    // all participants info of Party
    pub participants: Vec<Item>,
}

impl Party {
    fn escrow_sol(pid: u64) -> (Pubkey, u8) {
        Pubkey::find_program_address(
            &[PARTY_PDA_SEED, pid.to_le_bytes().as_ref(), ESCROW_SOL_SEED],
            &ID
        )
    }

    fn remaining_shares(&self) -> u64 {
        let current_shares = self
            .participants
            .iter()
            .fold(0, |acc, item| acc + item.shares_or_balance);

        self
            .target
            .checked_sub(current_shares)
            .unwrap_or_default()
    }

    fn can_dissolve(&self, operator: Pubkey) -> bool {
        self.creator == operator
            && !self.participants.is_empty()
            && (self.state == State::CrowdFunding
            || self.state == State::BuyNFTFail
            || self.state == State::SellNFTSuccess)
    }

    fn can_quit(&self, participant: Pubkey) -> bool {
        self.state == State::Dissolving
            && self.participants.iter().find(|e| e.account == participant).is_some()
    }

    fn can_close(&self, operator: Pubkey) -> bool {
        self.creator == operator
            && self.state == State::Dissolved
            && self.participants.is_empty()
    }

    fn space(capacity: u8) -> usize {
        // discriminator + cap_size + enum State
        8 + 1 + 1 +
            // target amount
            8 +
            // creator pubkey
            32 +
            // escrow_nft pubkey
            32 +
            // vec of item (pubkey, amount)
            // https://docs.rs/borsh/0.8.1/src/borsh/ser/mod.rs.html#304
            // (4 + (32 + 8) * (capacity as usize))
            // anchor v0.25.0 not support BtreeMap
            // use Vec now
            (4 + (32 + 8) * (capacity as usize))
    }

    fn translate(
        &mut self,
        total_balance: u64,
        actual_total_shares: u64,
    ) {
        assert!(actual_total_shares > 0, "nft_grab: total shares > 0; qed");

        for e in self.participants.iter_mut() {
            e.shares_or_balance = total_balance / actual_total_shares * e.shares_or_balance
        }
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub struct Item {
    pub account: Pubkey,
    pub shares_or_balance: u64,
}

#[repr(u8)]
#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum State {
    // dissolve and close by creator
    // quit by participant

    // can dissolve
    CrowdFunding,
    BuyNFTFail,
    SellNFTSuccess,

    // can't dissolve
    AgentBuyingNFT,
    AgentSellingNFT,
    BuyNFTSuccess,
    SellNFTFail,

    // can quit
    Dissolving,
    // can close
    Dissolved,
}

#[error_code]
pub enum ErrorCode {
    #[msg("nft_grab: party members is full")]
    PartyFull,
    #[msg("nft_grab: require 0 < target shares <= 1_000_000_000")]
    InvalidTarget,
    #[msg("nft_grab: require: 0 < capacity members <= 255")]
    InvalidCapacity,
    #[msg("nft_grab: Insufficient shares to participate")]
    InvalidShares,
    #[msg("nft_grab: Insufficient funds to participate")]
    InsufficientFunds,
    #[msg("nft_grab: Complete fundraising target shares")]
    CompleteTargetShares,
    #[msg("nft_grab: Ban participate the party")]
    BanParticipate,
    #[msg("nft_grab: Ban dissolve the party")]
    BanDissolve,
    #[msg("nft_grab: Ban quit the party")]
    BanQuit,
    #[msg("nft_grab: Ban close the party")]
    BanClose,
}
