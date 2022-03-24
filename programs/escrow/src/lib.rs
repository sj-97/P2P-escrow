use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, SetAuthority, TokenAccount, Transfer};
use spl_token::instruction::AuthorityType;

declare_id!("3wofyeYgFxwHPCuyUNvuArTdy6NRcHv8xdqdXjus3dgV");

#[program]
pub mod escrow {

    use super::*;

    /// pool_a_contents : number of initializer tokens
    /// pool_b_contents : number of receiver tokens
    pub fn init_contract(ctx: Context<InitContract>, recipient: Pubkey, pool_a_contents: u64, pool_b_contents: u64) -> Result<()> {
        let contract = &mut ctx.accounts.contract;
        contract.initializer_pubkey = ctx.accounts.initializer_account.key();
        contract.recipient_pubkey = recipient;
        contract.pool_a_contents = pool_a_contents;
        contract.pool_b_contents = pool_b_contents;
        contract.executed = false;
        contract.is_active = true;

        Ok(())
    }

    pub fn deposit_asset(ctx: Context<DepositAsset>, amount: u64) -> Result<()> {
        let asset = &mut ctx.accounts.asset;
        asset.mint_pubkey = ctx.accounts.provider_token_account.mint;
        asset.amount = amount;
        asset.contract_pubkey = ctx.accounts.contract.key();
        asset.payer_pubkey = ctx.accounts.provider_token_account.key();
        asset.satisfied = false;

        // check constraints
        if ctx.accounts.depositor_account.key() == ctx.accounts.contract.initializer_pubkey { //initializer is depositing tokens
            if amount != ctx.accounts.contract.pool_a_contents {
                return Err(error!(EscrowError::IncorrectAmount));
            }
        } else if ctx.accounts.depositor_account.key() == ctx.accounts.contract.recipient_pubkey { //recipient is depositing tokens
            if amount != ctx.accounts.contract.pool_b_contents {
                return Err(error!(EscrowError::IncorrectAmount));
            }
        } else {
            return Err(error!(EscrowError::IncorrectUserDepositing));
        }

        asset.satisfied = true;

        let (vault_authority, _vault_authority_bump) =
        Pubkey::find_program_address(&[b"escrow"], ctx.program_id);

        let cpi_accounts = SetAuthority {
            account_or_mint: ctx.accounts.vault_account.to_account_info().clone(),
            current_authority: ctx.accounts.depositor_account.clone(),
        };
        
        // change the authority (user space ownership) of vault account (token account) from payer to PDA
        token::set_authority(
            CpiContext::new(ctx.accounts.token_program.clone(), cpi_accounts),
            AuthorityType::AccountOwner,
            Some(vault_authority),
        )?;

        let cpi_accounts = Transfer {
            from: ctx.accounts
                .provider_token_account
                .to_account_info()
                .clone(),
            to: ctx.accounts.vault_account.to_account_info().clone(),
            authority: ctx.accounts.depositor_account.clone(),
        };

        // transfer tokens from token account of payer to the token account of PDA
        token::transfer(
            CpiContext::new(ctx.accounts.token_program.clone(), cpi_accounts),
            asset.amount,
        )?;

        Ok(())
    }

    pub fn swap(ctx: Context<Swap>) -> Result<()> {
        if ctx.accounts.contract.executed == true {
            return Err(error!(EscrowError::AlreadyExecuted));
        }
        let asset1 = &mut ctx.accounts.asset1;
        let asset2 = &mut ctx.accounts.asset2;
        let payer1 = asset1.payer_pubkey;
        if asset1.satisfied == false || asset2.satisfied == false {
            return Err(error!(EscrowError::AssetNotSatisfied));
        }
        asset1.payer_pubkey = asset2.payer_pubkey;
        asset2.payer_pubkey = payer1;
        Ok(())
    }

    pub fn withdraw_asset(ctx: Context<WithdrawAsset>) -> Result<()> {
        if ctx.accounts.contract.executed == true {
            return Err(error!(EscrowError::AlreadyExecuted));
        }

        let (vault_authority, _vault_authority_bump) =
        Pubkey::find_program_address(&[b"escrow"], ctx.program_id);

        if vault_authority != ctx.accounts.vault_authority.key() {
            return Err(error!(EscrowError::InvalidPDA));
        }

        if ctx.accounts.vault_account.key() != ctx.accounts.asset.payer_pubkey {
            return Err(error!(EscrowError::IncorrectUserWithdrawing));
        }

        let cpi_accounts = Transfer {
            from: ctx.accounts.vault_account.to_account_info().clone(),
            to: ctx.accounts
                .withdrawer_token_account
                .to_account_info()
                .clone(),
            authority: ctx.accounts.vault_authority.clone(),
        };

        // transfer tokens from token account of PDA to the token account of caller
        token::transfer(
            CpiContext::new(ctx.accounts.token_program.clone(), cpi_accounts),
            ctx.accounts.asset.amount,
        )?;
        Ok(())
    }
}

#[derive(Accounts)]
pub struct InitContract<'info> {
    #[account(init, payer = payer_account)]
    pub contract: Account<'info, Contract>,

    #[account(mut)]
    /// CHECK: This is not dangerous because we don't read or write from this account
    pub payer_account: AccountInfo<'info>,

    #[account(mut, signer)]
    /// CHECK: This is not dangerous because we don't read or write from this account
    pub initializer_account: AccountInfo<'info>,

    /// CHECK: This is not dangerous because we don't read or write from this account
    pub system_program: AccountInfo<'info>,
}

#[derive(Accounts)]
pub struct DepositAsset<'info> {
    #[account(init, payer = payer_account)]
    pub asset: Account<'info, Asset>,

    pub contract: Account<'info, Contract>,

    pub mint: Account<'info, Mint>,

    #[account(mut, signer)]
    /// CHECK: This is not dangerous because we don't read or write from this account
    pub depositor_account: AccountInfo<'info>,

    #[account(mut)]
    /// CHECK: This is not dangerous because we don't read or write from this account
    pub payer_account: AccountInfo<'info>,

    #[account(init, seeds = [b"escrow_token_account".as_ref()], bump, payer = payer_account, token::mint = mint, token::authority = depositor_account)]
    pub vault_account: Account<'info, TokenAccount>,

    pub provider_token_account: Account<'info, TokenAccount>,

    /// CHECK: This is not dangerous because we don't read or write from this account
    pub token_program: AccountInfo<'info>,
    /// CHECK: This is not dangerous because we don't read or write from this account
    pub system_program: AccountInfo<'info>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct WithdrawAsset<'info> {
    pub asset: Account<'info, Asset>,
    /// CHECK: This is not dangerous because we don't read or write from this account
    pub withdrawer_account: AccountInfo<'info>,
    pub withdrawer_token_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub vault_account: Account<'info, TokenAccount>,
    /// CHECK: This is not dangerous because we don't read or write from this account
    pub vault_authority: AccountInfo<'info>,
    pub contract: Account<'info, Contract>,
    /// CHECK: This is not dangerous because we don't read or write from this account
    pub token_program: AccountInfo<'info>,
}

#[derive(Accounts)]
pub struct Swap<'info> {
    #[account(mut)]
    pub asset1: Account<'info, Asset>,
    #[account(mut)]
    pub asset2: Account<'info, Asset>,
    pub contract: Account<'info, Contract>,
}

#[account]
#[derive(Default)]
pub struct Asset {
    mint_pubkey: Pubkey,
    amount: u64,
    contract_pubkey: Pubkey,
    payer_pubkey: Pubkey,
    satisfied: bool,
}

#[account]
#[derive(Default)]
pub struct Contract {
    initializer_pubkey: Pubkey,
    recipient_pubkey: Pubkey,
    expiration_time: i64, // not using this for now
    is_active: bool,
    executed: bool,
    pool_a_contents: u64,
    pool_b_contents: u64,
    // initializer_vault: Pubkey, // token account of PDA for tokens from initializer
    // recipient_value: Pubkey, // token account of PDA for tokens from recipient
}

#[error_code]
pub enum EscrowError {
    #[msg("Instruction not implemented.")]
    NotImplemented,
    #[msg("Incorrect amount sent")]
    IncorrectAmount,
    #[msg("Incorrect user depositing tokens")]
    IncorrectUserDepositing,
    #[msg("Incorrect user withdrawing tokens")]
    IncorrectUserWithdrawing,
    #[msg("Invalid PDA")]
    InvalidPDA,
    #[msg("Contract already executed")]
    AlreadyExecuted,
    #[msg("Asset not satisfied")]
    AssetNotSatisfied,
}