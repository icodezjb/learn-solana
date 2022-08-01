// import {
//     Connection,
//     Keypair,
//     LAMPORTS_PER_SOL,
//     PublicKey,
//     SendTransactionError,
//     SystemProgram,
//     Transaction,
//     TransactionInstruction,
// } from "@solana/web3.js";
//
// import * as borsh from "@project-serum/borsh";
// import {assert, expect} from "chai";
// import {sha256} from "js-sha256";
// import camelcase from "camelcase";
// import {snakeCase} from "snake-case";
//
// // namespace: ['global', 'account']
// // name: Instruction name or Account name
// function getDiscriminator(namespace: string, name: string): Buffer {
//     let preimage = "";
//
//     if (namespace === "global") {
//         let ixName = snakeCase(name);
//         preimage = `global:${ixName}`;
//     } else if (namespace === "account") {
//         let accountName = camelcase(name, { pascalCase: true});
//         preimage = `account:${accountName}`;
//     }
//
//     return Buffer.from(sha256.digest(preimage)).slice(0, 8);
// }
//
// const MY_PROGRAM_ID = new PublicKey(
//     "FteJ8GhF78qjo4acX7LmXi9RwzBcDnUax4FoB6xsMNA9"
// );
// const GLOBAL_LAYOUT = borsh.struct([
//     borsh.publicKey("initializer"),
//     borsh.u64("nextId"),
// ]);
//
// const PARTY_LAYOUT = borsh.struct([
//     borsh.u8("isInitialized"),
//     borsh.map(
//         borsh.publicKey("user"),
//         borsh.publicKey("amount"),
//         "participants"
//     ),
// ]);
//
// function toBytesU64(num) {
//     // an u64 takes 8 bytes
//     let arr = new ArrayBuffer(8);
//     let view = new DataView(arr);
//     // byteOffset = 0
//     // litteEndian = true
//     view.setUint32(0, num, true);
//     console.log(view)
//     return arr;
// }
//
// describe("nft-grab-web3", () => {
//     const connection = new Connection(
//         "http://localhost:8899",
//         "confirmed"
//     );
//
//     const payer = Keypair.generate();
//
//     let global = null;
//     let party = null;
//
//     it("initialize", async () => {
//         let latestHash = await connection.getLatestBlockhash("confirmed");
//         let signature = await connection.requestAirdrop(payer.publicKey, 10*LAMPORTS_PER_SOL);
//
//         // Airdropping tokens to a payer.
//         await connection.confirmTransaction(
//             {
//                 signature: signature,
//                 blockhash: latestHash.blockhash,
//                 lastValidBlockHeight: latestHash.lastValidBlockHeight
//             },
//             "confirmed"
//         );
//
//         // Get the PDA that is Global.
//         const [global, _nonce] = await PublicKey.findProgramAddress(
//             [Buffer.from("party")],
//             MY_PROGRAM_ID
//         );
//
//         const initializeIx = new TransactionInstruction({
//             programId: MY_PROGRAM_ID,
//             keys: [
//                 {
//                     pubkey: payer.publicKey,
//                     isSigner: true,
//                     isWritable: true,
//                 },
//                 {
//                     pubkey: global,
//                     isSigner: false,
//                     isWritable: true,
//                 },
//                 {
//                     pubkey: SystemProgram.programId,
//                     isSigner: false,
//                     isWritable: false,
//                 },
//             ],
//             data: Buffer.from(getDiscriminator("global", "initialize")),
//         });
//
//         const tx = new Transaction();
//         tx.add(initializeIx);
//
//         const signature2 = await connection.sendTransaction(
//             tx,
//             [payer],
//             {
//                 skipPreflight: false,
//                 preflightCommitment: "confirmed",
//             });
//         let latestHash2 = await connection.getLatestBlockhash("confirmed");
//
//         await connection.confirmTransaction({
//             signature: signature2,
//             blockhash: latestHash2.blockhash,
//             lastValidBlockHeight: latestHash2.lastValidBlockHeight
//         });
//
//         let globalAccount = await connection.getAccountInfo(global);
//         // skip 8 bytes discriminator
//         let globalData = GLOBAL_LAYOUT.decode(globalAccount.data.subarray(8));
//
//         assert.isTrue(globalData.initializer.equals(payer.publicKey));
//         assert.strictEqual(globalData.nextId.toNumber(), 1);
//
//         const payer2 = Keypair.generate();
//         try {
//             const initializeIx2 = new TransactionInstruction({
//                 programId: MY_PROGRAM_ID,
//                 keys: [
//                     {
//                         pubkey: payer2.publicKey,
//                         isSigner: true,
//                         isWritable: true,
//                     },
//                     {
//                         pubkey: global,
//                         isSigner: false,
//                         isWritable: true,
//                     },
//                     {
//                         pubkey: SystemProgram.programId,
//                         isSigner: false,
//                         isWritable: false,
//                     },
//                 ],
//                 data: Buffer.from(getDiscriminator("global", "initialize")),
//             });
//
//             const tx = new Transaction();
//             tx.add(initializeIx2);
//
//             const signature3 = await connection.sendTransaction(
//                 tx,
//                 [payer2],
//                 {
//                     skipPreflight: false,
//                     preflightCommitment: "confirmed",
//                 });
//
//             let latestHash3 = await connection.getLatestBlockhash("confirmed");
//
//             await connection.confirmTransaction({
//                 signature: signature3,
//                 blockhash: latestHash3.blockhash,
//                 lastValidBlockHeight: latestHash3.lastValidBlockHeight
//             });
//         } catch (_err) {
//             expect(_err).to.be.instanceOf(SendTransactionError);
//             const err: SendTransactionError = _err;
//             let index = err.message.indexOf("Attempt to debit an account but found no record of a prior credit");
//
//             /*
//               Attempt to debit an account but found no record of a prior credit
//             */
//             assert.isTrue(index!=-1);
//         }
//
//         globalAccount = await connection.getAccountInfo(global);
//         // skip 8 bytes discriminator
//         globalData = GLOBAL_LAYOUT.decode(globalAccount.data.subarray(8));
//
//         assert.isTrue(globalData.initializer.equals(payer.publicKey));
//         assert.strictEqual(globalData.nextId.toNumber(), 1);
//     });
// });
