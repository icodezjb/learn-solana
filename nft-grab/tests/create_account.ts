// import {
//     Connection,
//     Keypair,
//     LAMPORTS_PER_SOL,
//     PublicKey,
//     sendAndConfirmTransaction,
//     SystemProgram,
//     Transaction
// } from "@solana/web3.js";
// import {Buffer} from "buffer";
// import * as anchor from "@project-serum/anchor";
// import {assert} from "chai";
//
//
// describe("create account", () => {
//     it("create", async ()=> {
//         const connection = new Connection(
//             "http://localhost:8899",
//             "confirmed"
//         );
//         const PARTY_PDA_SEEDS = "party";
//         const PID = new PublicKey("FteJ8GhF78qjo4acX7LmXi9RwzBcDnUax4FoB6xsMNA9");
//         const payer = Keypair.generate();
//
//         // Get the PDA that is Global.
//         const [global, _nonce] = await PublicKey.findProgramAddress(
//             [Buffer.from(anchor.utils.bytes.utf8.encode(PARTY_PDA_SEEDS))],
//             PID
//         );
//
//         let seeds = [Buffer.from(anchor.utils.bytes.utf8.encode(PARTY_PDA_SEEDS))]
//             .concat(Buffer.from([_nonce]))
//
//         let greetedPubkey = await PublicKey.createWithSeed(
//             payer.publicKey,
//             PARTY_PDA_SEEDS,
//             new PublicKey("FteJ8GhF78qjo4acX7LmXi9RwzBcDnUax4FoB6xsMNA9"),
//         );
//
//         let latestHash = await connection.getLatestBlockhash("confirmed");
//         let sig = await connection.requestAirdrop(payer.publicKey, 10*LAMPORTS_PER_SOL);
//
//         await connection.confirmTransaction(
//             {
//                 lastValidBlockHeight: latestHash.lastValidBlockHeight,
//                 blockhash: latestHash.blockhash,
//                 signature: sig,
//             },
//             "confirmed"
//         );
//
//         const payerAccount = await connection.getAccountInfo(payer.publicKey);
//         console.log((payerAccount));
//
//         const lamports = await connection.getMinimumBalanceForRentExemption(400);
//
//         const transaction = new Transaction().add(
//             SystemProgram.createAccountWithSeed({
//                 fromPubkey: payer.publicKey,
//                 basePubkey: payer.publicKey,
//                 seed: PARTY_PDA_SEEDS,
//                 newAccountPubkey: greetedPubkey,
//                 lamports,
//                 space: 400,
//                 programId: new PublicKey("FteJ8GhF78qjo4acX7LmXi9RwzBcDnUax4FoB6xsMNA9"),
//             }),
//         );
//         let tx = await sendAndConfirmTransaction(
//             connection,
//             transaction,
//             [payer]
//         );
//
//
//         // const transaction = new Transaction();
//         // const instruction = SystemProgram.createAccountWithSeed({
//         //     fromPubkey: payer.publicKey,
//         //     newAccountPubkey: _global,
//         //     basePubkey: payer.publicKey,
//         //     lamports: 1000000000,
//         //     space: 10,
//         //     seed: seeds,
//         //     programId: SystemProgram.programId
//         // })
//         //
//         // transaction.add(instruction);
//         // let tx = await sendAndConfirmTransaction(
//         //     connection,
//         //     transaction,
//         //     [payer]
//         // );
//         console.log("zjbtest: ", tx)
//     })
// })
//
