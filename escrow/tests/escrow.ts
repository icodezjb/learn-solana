import * as anchor from "@project-serum/anchor";
import { Program, BN, IdlAccounts } from "@project-serum/anchor";
import { PublicKey, Keypair, SystemProgram } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, createMint, createAccount, mintTo, getAccount } from "@solana/spl-token";
import { assert } from "chai";
import { Escrow } from "../target/types/escrow";

type EscrowAccount = IdlAccounts<Escrow>["escrowAccount"];

describe("escrow", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Escrow as Program<Escrow>;

  let mintA: PublicKey = null;
  let mintB: PublicKey = null;
  let initializerTokenAccountA: PublicKey = null;
  let initializerTokenAccountB: PublicKey = null;
  let takerTokenAccountA: PublicKey = null;
  let takerTokenAccountB: PublicKey = null;
  let pda: PublicKey = null;

  const takerAmount = 1000;
  const initializerAmount = 500;

  const escrowAccount = Keypair.generate();
  const payer = Keypair.generate();
  const mintAuthority = Keypair.generate();

  it("Initialise escrow state", async () => {
    // Airdropping tokens to a payer.
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(payer.publicKey, 10000000000),
      "confirmed"
    );

    mintA = await createMint(
      provider.connection,
      payer,
      mintAuthority.publicKey,
      null,
      0,
    );

    mintB = await createMint(
      provider.connection,
      payer,
      mintAuthority.publicKey,
      null,
      0,
    );

    initializerTokenAccountA = await createAccount(
        provider.connection,
        payer,
        mintA,
        provider.wallet.publicKey,
    );

    takerTokenAccountA = await createAccount(
        provider.connection,
        payer,
        mintA,
        payer.publicKey,
    );

    initializerTokenAccountB = await createAccount(
        provider.connection,
        payer,
        mintB,
        provider.wallet.publicKey
    );

    takerTokenAccountB = await createAccount(
        provider.connection,
        payer,
        mintB,
        payer.publicKey
    );

    await mintTo(
        provider.connection,
        payer,
        mintA,
        initializerTokenAccountA,
        mintAuthority,
        initializerAmount
    );

    await mintTo(
        provider.connection,
        payer,
        mintB,
        takerTokenAccountB,
        mintAuthority,
        takerAmount
    );
    let _initializerTokenAccountA = await getAccount(
        provider.connection,
        initializerTokenAccountA
    );
    let _takerTokenAccountB = await getAccount(
        provider.connection,
        takerTokenAccountB
    );

    assert.strictEqual(
        Number(_initializerTokenAccountA.amount),
        initializerAmount
    );
    assert.strictEqual(
        _takerTokenAccountB.amount,
        BigInt(takerAmount)
    );
  });

  it("Initialize escrow", async () => {
    await program.methods
        .initializeEscrow(new BN(initializerAmount),new BN(takerAmount))
        .accounts({
          initializer: provider.wallet.publicKey,
          initializerDepositTokenAccount: initializerTokenAccountA,
          initializerReceiveTokenAccount: initializerTokenAccountB,
          escrowAccount: escrowAccount.publicKey,
          systemProgram: SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([escrowAccount])
        .rpc();

    // Get the PDA that is assigned authority to token account.
    const [_pda, _nonce] = await PublicKey.findProgramAddress(
      [Buffer.from(anchor.utils.bytes.utf8.encode("escrow"))],
      program.programId
    );

    pda = _pda;

    let _initializerTokenAccountA = await getAccount(
        provider.connection,
        initializerTokenAccountA
    );

    let _escrowAccount: EscrowAccount =
      await program.account.escrowAccount.fetch(escrowAccount.publicKey);

    // Check that the new owner is the PDA.
    assert.isTrue(_initializerTokenAccountA.owner.equals(pda));

    // Check that the values in the escrow account match what we expect.
    assert.isTrue(
      _escrowAccount.initializerKey.equals(provider.wallet.publicKey)
    );
    assert.strictEqual(
      _escrowAccount.initializerAmount.toNumber(),
      initializerAmount
    );
    assert.strictEqual(_escrowAccount.takerAmount.toNumber(), takerAmount);
    assert.isTrue(
      _escrowAccount.initializerDepositTokenAccount.equals(
        initializerTokenAccountA
      )
    );
    assert.isTrue(
      _escrowAccount.initializerReceiveTokenAccount.equals(
        initializerTokenAccountB
      )
    );
  });

  it("Exchange escrow", async () => {
    await program.methods
        .exchange()
        .accounts({
            taker: payer.publicKey,
            takerDepositTokenAccount: takerTokenAccountB,
            takerReceiveTokenAccount: takerTokenAccountA,
            pdaDepositTokenAccount: initializerTokenAccountA,
            initializerReceiveTokenAccount: initializerTokenAccountB,
            initializerMainAccount: provider.wallet.publicKey,
            escrowAccount: escrowAccount.publicKey,
            pdaAccount: pda,
            tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([payer])
        .rpc()

    let _takerTokenAccountA = await getAccount(
        provider.connection,
        takerTokenAccountA
    );
    let _takerTokenAccountB = await getAccount(
        provider.connection,
        takerTokenAccountB
    );
    let _initializerTokenAccountA = await getAccount(
        provider.connection,
        initializerTokenAccountA
    );
    let _initializerTokenAccountB = await getAccount(
        provider.connection,
        initializerTokenAccountB
    );

    // Check that the initializer gets back ownership of their token account.
    assert.isTrue(_takerTokenAccountA.owner.equals(payer.publicKey));

    assert.strictEqual(
      _takerTokenAccountA.amount,
      BigInt(initializerAmount)
    );
    assert.strictEqual(
        _initializerTokenAccountA.amount,
        BigInt(0)
    );
    assert.strictEqual(
      _initializerTokenAccountB.amount,
        BigInt(takerAmount)
    );
    assert.strictEqual(
        _takerTokenAccountB.amount,
        BigInt(0)
    );
  });

  let newEscrow = Keypair.generate();

  it("Initialize escrow and cancel escrow", async () => {
    // Put back tokens into initializer token A account.
    await mintTo(
        provider.connection,
        payer,
        mintA,
        initializerTokenAccountA,
        mintAuthority,
        initializerAmount
    );

    await program.methods
        .initializeEscrow(new BN(initializerAmount), new BN(takerAmount))
        .accounts({
          initializer: provider.wallet.publicKey,
          initializerDepositTokenAccount: initializerTokenAccountA,
          initializerReceiveTokenAccount: initializerTokenAccountB,
          escrowAccount: newEscrow.publicKey,
          systemProgram: SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([newEscrow])
        .rpc()

    let _initializerTokenAccountA = await getAccount(
        provider.connection,
        initializerTokenAccountA
    );

    // Check that the new owner is the PDA.
    assert.isTrue(_initializerTokenAccountA.owner.equals(pda));

    // Cancel the escrow.
    await program.methods
        .cancelEscrow()
        .accounts({
          initializer: provider.wallet.publicKey,
          pdaDepositTokenAccount: initializerTokenAccountA,
          pdaAccount: pda,
          escrowAccount: newEscrow.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .rpc()

    // Check the final owner should be the provider public key.
    _initializerTokenAccountA = await getAccount(
        provider.connection,
        initializerTokenAccountA
    );
    assert.isTrue(
      _initializerTokenAccountA.owner.equals(provider.wallet.publicKey)
    );

    // Check all the funds are still there.
    assert.strictEqual(
      _initializerTokenAccountA.amount,
      BigInt(initializerAmount)
    );
  });
});
