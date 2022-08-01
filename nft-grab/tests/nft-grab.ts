import * as anchor from "@project-serum/anchor";
import {AnchorError, BN, IdlAccounts, Program} from "@project-serum/anchor";
import {NftGrab} from "../target/types/nft_grab";
import {Keypair, LAMPORTS_PER_SOL, PublicKey, SendTransactionError} from "@solana/web3.js";
import {assert, expect} from "chai";
import {Buffer} from "buffer";

type GlobalInfo = IdlAccounts<NftGrab>["global"];

const PARTY_PDA_SEEDS = "party";
const ESCROW_SOL_SEEDS = "escrow_sol";
const PARTY_ACCOUNT_SIZE_10 = 486;
const PARTY_ACCOUNT_SIZE_1 = 126;
const SOL_PER_SHARE = 100000000; // 0.1 SOL

function toBytesU64(num) {
    // an u64 takes 8 bytes
    let arr = new ArrayBuffer(8);
    let view = new DataView(arr);
    view.setUint32(0, num, true);

    return arr;
}

describe("nft-grab", () => {
    // Configure the client to use the local cluster.
    const provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);

    const program = anchor.workspace.NftGrab as Program<NftGrab>;
    const payer = Keypair.generate();
    const payer2 = Keypair.generate();

    let global: PublicKey = null;
    let party: PublicKey = null;
    let party2: PublicKey = null;
    let partyEscrow: PublicKey = null;
    let partyEscrow2: PublicKey = null;

    it("parye initialize", async () => {
        let latestHash = await provider.connection.getLatestBlockhash("confirmed");
        let signature = await provider.connection.requestAirdrop(payer.publicKey, 10 * LAMPORTS_PER_SOL);

        // Airdropping tokens to payer.
        await provider.connection.confirmTransaction(
            {
                signature: signature,
                blockhash: latestHash.blockhash,
                lastValidBlockHeight: latestHash.lastValidBlockHeight
            },
            "confirmed"
        );

        // Get the PDA that is Global.
        [global] = await PublicKey.findProgramAddress(
            [Buffer.from(anchor.utils.bytes.utf8.encode(PARTY_PDA_SEEDS))],
            program.programId
        );

        await program.methods
            .initialize()
            .accounts({
                initializer: payer.publicKey,
                global: global
            })
            .signers([payer])
            .rpc();

        let globalInfo: GlobalInfo = await program.account.global.fetch(global);

        assert.isTrue(globalInfo.initializer.equals(payer.publicKey));
        assert.strictEqual(globalInfo.nextId.toNumber(), 1);

        try {
            await program.methods
                .initialize()
                .accounts({
                    initializer: payer2.publicKey,
                    global
                })
                .signers([payer2])
                .rpc();
        } catch (_err) {
            expect(_err).to.be.instanceOf(SendTransactionError);
            const err: SendTransactionError = _err;
            /*
              logs: [
                'Program Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS invoke [1]',
                'Program log: Instruction: Initialize',
                'Program 11111111111111111111111111111111 invoke [2]',
                'Allocate: account Address { address: BmVrY8CjYK1A83haa3RdiAKNqopPESAqcbPvDhczxKUp, base: None } already in use',
                'Program 11111111111111111111111111111111 failed: custom program error: 0x0',
                'Program Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS consumed 5664 of 200000 compute units',
                'Program Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS failed: custom program error: 0x0'
              ]
            */
            assert.strictEqual(
                err.logs[3],
                "Allocate: account Address { address: BmVrY8CjYK1A83haa3RdiAKNqopPESAqcbPvDhczxKUp, base: None } already in use"
            );
        }

        assert.isTrue(globalInfo.initializer.equals(payer.publicKey));
        assert.strictEqual(globalInfo.nextId.toNumber(), 1);
    });

    it("payer create party 1 with cap 10", async () => {
        let globalInfo: GlobalInfo = await program.account.global.fetch(global);
        assert.isTrue(globalInfo.initializer.equals(payer.publicKey));
        assert.strictEqual(globalInfo.nextId.toNumber(), 1);

        // Get the PDA that is Party.
        [party] = await PublicKey.findProgramAddress(
            [
                Buffer.from(anchor.utils.bytes.utf8.encode(PARTY_PDA_SEEDS)),
                Buffer.from(toBytesU64(1))
            ],
            program.programId
        );

        await program.methods
            .createParty(10, new BN(100))
            .accounts({
                creator: payer.publicKey,
                global: global,
                party: party
            })
            .signers([payer])
            .rpc();

        const partyAccount = await program.provider.connection.getAccountInfo(party);
        assert.lengthOf(partyAccount.data, PARTY_ACCOUNT_SIZE_10);

        let min_rent = await program.provider.connection.getMinimumBalanceForRentExemption(PARTY_ACCOUNT_SIZE_10);
        assert.isTrue(partyAccount.lamports === min_rent);

        let partyInfo = await program.account.party.fetch(party);
        assert.isTrue(partyInfo.cap === 10);
        assert.isTrue(partyInfo.target.toNumber() === 100);
        assert.isTrue(partyInfo.state.propertyIsEnumerable("crowdFunding"));
        assert.isTrue(partyInfo.creator.toString() === payer.publicKey.toString());
        assert.isTrue((Array.isArray(partyInfo.participants)));
        assert.lengthOf(partyInfo.participants,0);
        assert.strictEqual(partyInfo.escrowNft.toString(), PublicKey.default.toString());
    });

    it("payer create party 2 with cap 1", async () => {
        let globalInfo: GlobalInfo = await program.account.global.fetch(global);
        assert.isTrue(globalInfo.initializer.equals(payer.publicKey));
        assert.strictEqual(globalInfo.nextId.toNumber(), 2);

        // Get the PDA that is Party.
        [party2] = await PublicKey.findProgramAddress(
            [
                Buffer.from(anchor.utils.bytes.utf8.encode(PARTY_PDA_SEEDS)),
                Buffer.from(toBytesU64(2))
            ],
            program.programId
        );

        await program.methods
            .createParty(1, new BN(100))
            .accounts({
                creator: payer.publicKey,
                global: global,
                party: party2
            })
            .signers([payer])
            .rpc();

        const party2Account = await program.provider.connection.getAccountInfo(party2);
        assert.lengthOf(party2Account.data, PARTY_ACCOUNT_SIZE_1);
    });

    it("payer2 participate party 1", async () => {
        let latestHash = await provider.connection.getLatestBlockhash("confirmed");
        let signature = await provider.connection.requestAirdrop(payer2.publicKey, 10 * LAMPORTS_PER_SOL);

        // Airdropping tokens to payer2.
        await provider.connection.confirmTransaction(
            {
                signature: signature,
                blockhash: latestHash.blockhash,
                lastValidBlockHeight: latestHash.lastValidBlockHeight
            },
            "confirmed"
        );

        // Get the PDA that is Party Escrow.
        [partyEscrow] = await PublicKey.findProgramAddress(
            [
                Buffer.from(anchor.utils.bytes.utf8.encode(PARTY_PDA_SEEDS)),
                Buffer.from(toBytesU64(1)),
                Buffer.from(anchor.utils.bytes.utf8.encode(ESCROW_SOL_SEEDS))
            ],
            program.programId
        );

        let globalInfo: GlobalInfo = await program.account.global.fetch(global);
        assert.isTrue(globalInfo.initializer.equals(payer.publicKey));
        assert.strictEqual(globalInfo.nextId.toNumber(), 3);

        let escrowAccount = await program.provider.connection.getAccountInfo(partyEscrow);
        assert.isTrue(escrowAccount === null);

        // participate party 1 with 1 share (0.1 SOL)
        await program.methods
            .participate(new BN(1), new BN(1))
            .accounts({
                participant: payer2.publicKey,
                party,
                escrowSol: partyEscrow
            })
            .signers([payer2])
            .rpc();

        const partyAccount = await program.provider.connection.getAccountInfo(party);
        assert.lengthOf(partyAccount.data, PARTY_ACCOUNT_SIZE_10);

        escrowAccount = await program.provider.connection.getAccountInfo(partyEscrow);
        assert.isTrue(escrowAccount.lamports === SOL_PER_SHARE);

        let partyInfo = await program.account.party.fetch(party);
        assert.isTrue(partyInfo.cap === 10);
        assert.isTrue(partyInfo.target.toNumber() === 100);
        assert.isTrue(partyInfo.state.propertyIsEnumerable("crowdFunding"));
        assert.isTrue(partyInfo.creator.toString() === payer.publicKey.toString());
        assert.isTrue((Array.isArray(partyInfo.participants)));
        assert.lengthOf(partyInfo.participants, 1);
        assert.isTrue(partyInfo.participants[0].account.toString() === payer2.publicKey.toString());
        assert.isTrue(partyInfo.participants[0].sharesOrBalance.toNumber() === 1);
    });

    it("payer2 participate party 2", async () => {
        let latestHash = await provider.connection.getLatestBlockhash("confirmed");
        let signature = await provider.connection.requestAirdrop(payer2.publicKey, 10 * LAMPORTS_PER_SOL);

        // Airdropping tokens to payer2.
        await provider.connection.confirmTransaction(
            {
                signature: signature,
                blockhash: latestHash.blockhash,
                lastValidBlockHeight: latestHash.lastValidBlockHeight
            },
            "confirmed"
        );

        // Get the PDA that is Party Escrow 2.
        [partyEscrow2] = await PublicKey.findProgramAddress(
            [
                Buffer.from(anchor.utils.bytes.utf8.encode(PARTY_PDA_SEEDS)),
                Buffer.from(toBytesU64(2)),
                Buffer.from(anchor.utils.bytes.utf8.encode(ESCROW_SOL_SEEDS))
            ],
            program.programId
        );

        let globalInfo: GlobalInfo = await program.account.global.fetch(global);
        assert.isTrue(globalInfo.initializer.equals(payer.publicKey));
        assert.strictEqual(globalInfo.nextId.toNumber(), 3);

        let escrowAccount2 = await program.provider.connection.getAccountInfo(partyEscrow2);
        assert.isTrue(escrowAccount2 === null);

        // participate party 2 with 1 share (0.1 SOL)
        await program.methods
            .participate(new BN(2), new BN(1))
            .accounts({
                participant: payer2.publicKey,
                party: party2,
                escrowSol: partyEscrow2
            })
            .signers([payer2])
            .rpc();

        const party2Account = await program.provider.connection.getAccountInfo(party2);
        assert.lengthOf(party2Account.data, PARTY_ACCOUNT_SIZE_1);
        escrowAccount2 = await program.provider.connection.getAccountInfo(partyEscrow2);
        assert.isTrue(escrowAccount2.lamports === SOL_PER_SHARE);

        let party2Info = await program.account.party.fetch(party2);
        assert.isTrue(party2Info.cap === 1);
        assert.isTrue(party2Info.target.toNumber() === 100);
        assert.isTrue(party2Info.state.propertyIsEnumerable("crowdFunding"));
        assert.isTrue(party2Info.creator.toString() === payer.publicKey.toString());
        assert.isTrue((Array.isArray(party2Info.participants)));
        assert.lengthOf(party2Info.participants, 1);
        assert.isTrue(party2Info.participants[0].account.toString() === payer2.publicKey.toString());
        assert.isTrue(party2Info.participants[0].sharesOrBalance.toNumber() === 1);

        try {
            // participate party 2 with 1 share (0.1 SOL) again
            await program.methods
                .participate(new BN(2), new BN(1))
                .accounts({
                    participant: payer2.publicKey,
                    party: party2,
                    escrowSol: partyEscrow2
                })
                .signers([payer2])
                .rpc();
        } catch (_err) {
            expect(_err).to.be.instanceOf(AnchorError);
            const err: AnchorError = _err;

            assert.strictEqual(
                err.error.errorMessage.toString(),
                'nft_grab: party members is full'
            )
        }
    });

    it("payer dissolve party 2", async () => {
        let party2Info = await program.account.party.fetch(party2);
        assert.isTrue(party2Info.state.propertyIsEnumerable("crowdFunding"));
        assert.isTrue(party2Info.participants[0].sharesOrBalance.toNumber() === 1);

        // payer dissolve party 2
        await program.methods
            .dissolve(new BN(2))
            .accounts({
                operator: payer.publicKey,
                party: party2,
                escrowSol: partyEscrow2
            })
            .signers([payer])
            .rpc();

        party2Info = await program.account.party.fetch(party2);
        assert.isTrue(party2Info.state.propertyIsEnumerable("dissolving"));
        assert.isTrue(party2Info.participants[0].sharesOrBalance.toNumber() === SOL_PER_SHARE);
    });

    it("payer2 quit party 2", async () => {
        let party2Info = await program.account.party.fetch(party2);
        assert.isTrue(party2Info.state.propertyIsEnumerable("dissolving"));
        assert.lengthOf(party2Info.participants, 1);

        let payer2Account = await program.provider.connection.getAccountInfo(payer2.publicKey);
        let payer2Balance = payer2Account.lamports;

        let escrowAccount2 = await program.provider.connection.getAccountInfo(partyEscrow2);
        assert.isTrue(escrowAccount2.lamports === SOL_PER_SHARE);

        // payer2 quit party 2 with payer signature
        await program.methods
            .quit(new BN(2))
            .accounts({
                operator: payer.publicKey,
                participant: payer2.publicKey,
                party: party2,
                escrowSol: partyEscrow2,
            })
            .signers([payer])
            .rpc();

        party2Info = await program.account.party.fetch(party2);
        assert.isTrue(party2Info.state.propertyIsEnumerable("dissolved"));
        assert.lengthOf(party2Info.participants, 0);

        payer2Account = await program.provider.connection.getAccountInfo(payer2.publicKey);
        assert.isTrue(payer2Account.lamports === payer2Balance + SOL_PER_SHARE)

        escrowAccount2 = await program.provider.connection.getAccountInfo(partyEscrow2);
        // escrow2Balance - SOL_PER_SHARE = 0
        assert.isTrue(escrowAccount2 === null);
    });

    it("payer close party 2", async () => {
        let party2Info = await program.account.party.fetch(party2);
        assert.isTrue(party2Info.state.propertyIsEnumerable("dissolved"));
        assert.lengthOf(party2Info.participants, 0);
        let escrowAccount2 = await program.provider.connection.getAccountInfo(partyEscrow2);
        assert.isTrue(escrowAccount2 === null);

        // payer close party 2 with payer signature
        await program.methods
            .close(new BN(2))
            .accounts({
                operator: payer.publicKey,
                party: party2,
            })
            .signers([payer])
            .rpc();

        try {
            await program.account.party.fetch(party2);
        } catch (err) {
            assert.isTrue(err.toString().startsWith("Error: Account does not exist"))
        }

    });

});
