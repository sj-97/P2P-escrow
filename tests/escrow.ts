import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import NodeWallet from '@project-serum/anchor/dist/cjs/nodewallet';
import { Escrow } from "../target/types/escrow";
import idl from "../target/idl/escrow.json";
import { createMint, TOKEN_PROGRAM_ID, createAccount, mintTo, getAccount, getMint } from "@solana/spl-token"; 
import { PublicKey, SystemProgram, Transaction, Connection, LAMPORTS_PER_SOL} from '@solana/web3.js';
import { assert } from "chai";

describe('escrow', () => {
  const connection = new Connection("https://api.devnet.solana.com/");
  const options = anchor.Provider.defaultOptions();
  const wallet = NodeWallet.local();
  // const provider = anchor.Provider.env()
  const provider = new anchor.Provider(connection, wallet, options);

  anchor.setProvider(provider);
  const programId = "3wofyeYgFxwHPCuyUNvuArTdy6NRcHv8xdqdXjus3dgV";

  // const program = anchor.workspace.Escrow as Program<Escrow>;
  const program = new anchor.Program(idl, programId, provider) as Program<Escrow>;

  let mintA = null;
  let mintB = null;
  let initializerTokenAccountA = null;
  let initializerTokenAccountB = null;
  let takerTokenAccountA = null;
  let takerTokenAccountB = null;
  let vault_account_pda = null;
  let vault_account_bump = null;
  let vault_authority_pda = null;

  const takerAmount = 1000; // 1000 B
  const initializerAmount = 500; // 500 A

  const escrowAccount = anchor.web3.Keypair.fromSecretKey(Uint8Array.from([160,203,77,45,220,164,124,174,27,3,96,103,4,225,97,165,8,235,25,63,148,13,168,147,128,27,101,137,71,246,83,117,186,186,199,165,22,7,120,68,84,217,246,131,213,155,154,69,124,109,197,9,174,104,202,99,152,55,46,235,113,133,159,203]));
  
  const payer = anchor.web3.Keypair.fromSecretKey(Uint8Array.from([8,11,131,144,28,15,169,138,205,199,86,141,159,48,157,231,43,22,152,207,114,194,139,103,154,37,32,23,186,109,50,253,142,37,75,19,30,32,169,12,26,151,229,148,86,212,249,19,245,85,78,180,84,146,215,122,214,168,173,2,237,116,235,196]));
  const mintAuthority = anchor.web3.Keypair.fromSecretKey(Uint8Array.from([239,1,133,196,251,204,213,185,50,245,213,139,236,254,69,253,139,232,135,138,11,19,173,129,179,9,159,208,157,23,206,179,55,128,90,204,55,203,17,223,182,126,12,15,205,67,123,83,169,111,17,247,199,245,64,76,5,104,97,72,145,230,244,200]));
  const initializerMainAccount = anchor.web3.Keypair.fromSecretKey(Uint8Array.from([112,105,149,104,97,14,239,170,125,158,219,56,180,91,175,45,50,3,106,233,2,113,0,54,209,203,60,178,45,85,225,205,197,218,3,225,128,239,78,240,253,158,188,93,145,211,228,58,163,52,13,148,66,160,219,125,88,12,221,148,176,142,236,76]));
  const takerMainAccount = anchor.web3.Keypair.fromSecretKey(Uint8Array.from([180,130,132,173,18,35,178,133,54,38,105,198,112,191,95,85,137,141,251,122,134,96,91,73,70,197,37,45,192,147,50,143,206,157,174,114,242,122,232,70,85,6,73,117,215,52,221,196,181,15,113,23,19,23,113,22,220,22,2,239,53,240,41,58]));

  // it("Initialize program state", async () => {
  //   // // Airdropping tokens to a payer.
  //   // await provider.connection.confirmTransaction(
  //   //   await provider.connection.requestAirdrop(payer.publicKey, 2*LAMPORTS_PER_SOL),
  //   //   "processed"
  //   // );
  //   // console.log("airdrop received");

  //   // Fund Main Accounts
  //   await provider.send(
  //     (() => {
  //       const tx = new Transaction();
  //       tx.add(
  //         SystemProgram.transfer({
  //           fromPubkey: payer.publicKey,
  //           toPubkey: initializerMainAccount.publicKey,
  //           lamports: LAMPORTS_PER_SOL/10,
  //         }),
  //         SystemProgram.transfer({
  //           fromPubkey: payer.publicKey,
  //           toPubkey: takerMainAccount.publicKey,
  //           lamports: LAMPORTS_PER_SOL/10,
  //         })
  //       );
  //       return tx;
  //     })(),
  //     [payer]
  //   );

  //   console.log("funded main accounts");

  //   mintA = await createMint(
  //     provider.connection,
  //     payer,
  //     mintAuthority.publicKey,
  //     null,
  //     0
  //   );

  //   mintB = await createMint(
  //     provider.connection,
  //     payer,
  //     mintAuthority.publicKey,
  //     null,
  //     0
  //   );

  //   console.log(mintA.toString())
  //   console.log(mintB.toString())

  //   console.log("mint accounts created");

  //   initializerTokenAccountA = await createAccount(provider.connection, initializerMainAccount, mintA, initializerMainAccount.publicKey);
  //   takerTokenAccountA = await createAccount(provider.connection, takerMainAccount, mintA, takerMainAccount.publicKey);
  //   initializerTokenAccountB = await createAccount(provider.connection, initializerMainAccount, mintB, initializerMainAccount.publicKey);
  //   takerTokenAccountB = await createAccount(provider.connection, takerMainAccount, mintB, takerMainAccount.publicKey);
    
  //   console.log(initializerTokenAccountA.toString())
  //   console.log(initializerTokenAccountB.toString())
  //   console.log(takerTokenAccountA.toString())
  //   console.log(takerTokenAccountB.toString())

  //   console.log("token accounts created");

  //   await mintTo(
  //     provider.connection,
  //     payer,
  //     mintA,
  //     initializerTokenAccountA,
  //     mintAuthority,
  //     initializerAmount
  //   );

  //   await mintTo(
  //     provider.connection,
  //     payer,
  //     mintB,
  //     takerTokenAccountB,
  //     mintAuthority,
  //     takerAmount
  //   ); 
  //   console.log("minted tokens");

  //   let _initializerTokenAccountA = await getAccount(connection, initializerTokenAccountA);
  //   let _takerTokenAccountB = await getAccount(connection, takerTokenAccountB);
  //   console.log(_initializerTokenAccountA);
  //   console.log(_takerTokenAccountB);
  // });

  // it("Initialize escrow", async () => {
  //   console.log(program.programId.toString());
  //   // let programInfo = await getAccount(provider.connection, program.programId);
  //   // console.log(programInfo);

  //   const [_vault_account_pda, _vault_account_bump] = await PublicKey.findProgramAddress(
  //     [Buffer.from(anchor.utils.bytes.utf8.encode("escrow_token_account"))],
  //     program.programId
  //   );
  //   vault_account_pda = _vault_account_pda;
  //   vault_account_bump = _vault_account_bump;

  //   const [_vault_authority_pda, _vault_authority_bump] = await PublicKey.findProgramAddress(
  //     [Buffer.from(anchor.utils.bytes.utf8.encode("escrow"))],
  //     program.programId
  //   );
  //   vault_authority_pda = _vault_authority_pda;
    
  //   console.log("sending instruction init_contract...");

  //   await program.rpc.initContract(
  //     takerMainAccount.publicKey,
  //     new anchor.BN(initializerAmount),
  //     new anchor.BN(takerAmount),
  //     {
  //       accounts: {
  //         contract: escrowAccount.publicKey,
  //         payerAccount: initializerMainAccount.publicKey,
  //         initializerAccount: initializerMainAccount.publicKey,
  //         // vaultAccount: vault_account_pda,
  //         // mint: mintA.publicKey,
  //         // initializerDepositTokenAccount: initializerTokenAccountA,
  //         // initializerReceiveTokenAccount: initializerTokenAccountB,
  //         systemProgram: SystemProgram.programId,
  //         // rent: anchor.web3.SYSVAR_RENT_PUBKEY,
  //         // tokenProgram: TOKEN_PROGRAM_ID,
  //       },
  //       // instructions: [
  //       //   await program.account.contract.createInstruction(escrowAccount),
  //       // ],
  //       signers: [escrowAccount, initializerMainAccount],
  //     }
  //   );

  //   console.log("instruction init_contract succeeded");

  //   // let _vault = await mintA.getAccountInfo(vault_account_pda);

  //   let _escrowAccount = await program.account.contract.fetch(
  //     escrowAccount.publicKey
  //   );

  //   // // Check that the new owner is the PDA.
  //   // assert.ok(_vault.owner.equals(vault_authority_pda));

  //   // Check that the values in the escrow account match what we expect.
  //   assert.ok(_escrowAccount.initializerPubkey.equals(initializerMainAccount.publicKey));
  //   assert.ok(_escrowAccount.poolAContents.toNumber() == initializerAmount);
  // });

  // console.log(mintA.toString());

  it("Exchange escrow state", async () => {

    //re-init accounts

    // const asset_init = anchor.web3.Keypair.fromSecretKey(Uint8Array.from([130,174,176,62,211,128,238,61,162,240,156,95,170,81,90,251,198,149,142,208,236,121,50,203,1,247,7,143,251,136,227,236,4,94,188,85,100,30,115,153,178,211,57,39,93,137,188,101,99,56,150,141,246,26,121,184,195,82,211,145,103,96,251,161]));
    // const asset_rec = anchor.web3.Keypair.fromSecretKey(Uint8Array.from([111,205,241,31,194,100,89,150,182,42,178,48,185,153,242,248,254,16,98,30,178,243,227,191,72,142,97,109,239,201,216,126,105,45,186,237,116,148,128,173,200,97,3,229,240,223,96,77,69,176,72,140,146,35,7,163,141,227,133,142,177,221,171,111]));

    const asset_init = anchor.web3.Keypair.generate();
    const asset_rec = anchor.web3.Keypair.generate();

    const mintA_pub = new PublicKey("8vYDtefvLdjnBsumYpPYK1rpey6eoxXu4kKxkeiiLgRf");
    const mintB_pub = new PublicKey("3JoRigCQt3utjanico48ERfqKnFbnWKSqCnTHRvmHoMC");

    const initializerTokenAccountA_pub = new PublicKey("GsXHPRprYeTkKrR8ktoCfP6K9j2kBhkrfWJutb9qCvse");
    const initializerTokenAccountB_pub = new PublicKey("9Pe9WkKFJyxt3xUBWvEv3UgtAvPG7Yo5JDxqpXeasYCL");
    const takerTokenAccountA_pub = new PublicKey("BZ11dwCA957wf6bTGRsaviaLLsDvtwY4yQeDEeXTnWTb");
    const takerTokenAccountB_pub = new PublicKey("A35kfiNiiKu2Yk1gBZsjWUK23zmG1wL7re8JP49iypLr");

    mintA = await getMint(
      provider.connection,
      mintA_pub
    );

    mintB = await getMint(
      provider.connection,
      mintB_pub
    );

    initializerTokenAccountA = await getAccount(provider.connection, initializerTokenAccountA_pub);
    takerTokenAccountA = await getAccount(provider.connection, takerTokenAccountA_pub);
    initializerTokenAccountB = await getAccount(provider.connection, initializerTokenAccountB_pub);
    takerTokenAccountB = await getAccount(provider.connection, takerTokenAccountB_pub);

    await mintTo(
      provider.connection,
      payer,
      mintA.address,
      initializerTokenAccountA.address,
      mintAuthority,
      initializerAmount
    );

    console.log(initializerTokenAccountA);
    console.log(takerTokenAccountB);

    const [vault_account_pda_init, _vault_account_bump_init] = await PublicKey.findProgramAddress(
      [Buffer.from(anchor.utils.bytes.utf8.encode("escrow_token_account")), asset_init.publicKey.toBuffer()],
      program.programId
    );

    const [vault_account_pda_rec, _vault_account_bump_rec] = await PublicKey.findProgramAddress(
      [Buffer.from(anchor.utils.bytes.utf8.encode("escrow_token_account")), asset_rec.publicKey.toBuffer()],
      program.programId
    );

    const [_vault_authority_pda, _vault_authority_bump] = await PublicKey.findProgramAddress(
      [Buffer.from(anchor.utils.bytes.utf8.encode("escrow"))],
      program.programId
    );
    vault_authority_pda = _vault_authority_pda;

    console.log(initializerMainAccount.publicKey.toString())

    await program.rpc.depositAsset(
      new anchor.BN(initializerAmount),
      {
      accounts: {
        asset: asset_init.publicKey,
        contract: escrowAccount.publicKey,
        mint: mintA.address,
        depositorAccount: initializerMainAccount.publicKey,
        payerAccount: initializerMainAccount.publicKey,
        vaultAccount: vault_account_pda_init,
        providerTokenAccount: initializerTokenAccountA.address,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      },
      signers: [initializerMainAccount, asset_init]
    });

    await program.rpc.depositAsset(
      new anchor.BN(takerAmount),
      {
      accounts: {
        asset: asset_init.publicKey,
        contract: escrowAccount.publicKey,
        mint: mintB.address,
        depositorAccount: takerMainAccount.publicKey,
        payerAccount: payer.publicKey,
        vaultAccount: vault_account_pda_rec,
        providerTokenAccount: takerTokenAccountB.address,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      },
      signers: [takerMainAccount]
    });

    await program.rpc.swap({
      accounts: {
        asset1: asset_init.publicKey,
        asset2: asset_rec.publicKey,
        contract: escrowAccount.publicKey
      },
      signers: [takerMainAccount]
    });

    await program.rpc.withdrawAsset({
      accounts: {
        asset: asset_init.publicKey,
        withdrawerAccount: initializerMainAccount,
        withdrawerTokenAccount: initializerTokenAccountB,
        vaultAuthority: vault_authority_pda,
        contract: escrowAccount.publicKey,
        vaultAccount: vault_account_pda_init,
        tokenProgram: TOKEN_PROGRAM_ID
      },
      signers: [takerMainAccount]
    });

    await program.rpc.withdrawAsset({
      accounts: {
        asset: asset_rec.publicKey,
        withdrawerAccount: takerMainAccount,
        withdrawerTokenAccount: takerTokenAccountA,
        vaultAuthority: vault_authority_pda,
        contract: escrowAccount.publicKey,
        vaultAccount: vault_account_pda_rec,
        tokenProgram: TOKEN_PROGRAM_ID
      },
      signers: [takerMainAccount]
    });

    let _takerTokenAccountA = await mintA.getAccountInfo(takerTokenAccountA);
    let _takerTokenAccountB = await mintB.getAccountInfo(takerTokenAccountB);
    let _initializerTokenAccountA = await mintA.getAccountInfo(initializerTokenAccountA);
    let _initializerTokenAccountB = await mintB.getAccountInfo(initializerTokenAccountB);

    assert.ok(_takerTokenAccountA.amount.toNumber() == initializerAmount);
    assert.ok(_initializerTokenAccountA.amount.toNumber() == 0);
    assert.ok(_initializerTokenAccountB.amount.toNumber() == takerAmount);
    assert.ok(_takerTokenAccountB.amount.toNumber() == 0);
  });
});