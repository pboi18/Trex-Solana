use anchor_lang::prelude::*;

declare_id!("DevnetExample1111111111111111111111111111111111");

#[program]
pub mod trex_wager {
    use super::*;

    pub fn initialize_game(ctx: Context<InitializeGame>, nonce: u8, wager_lamports: u64) -> Result<()> {
        let game = &mut ctx.accounts.game;
        game.player = ctx.accounts.player.key();
        game.wager = wager_lamports;
        game.escrow = ctx.accounts.escrow.key();
        game.settled = false;
        game.nonce = nonce;
        Ok(())
    }

    pub fn settle_game(ctx: Context<SettleGame>, winner_amount: u64, admin_amount: u64) -> Result<()> {
        let game = &mut ctx.accounts.game;
        require!(!game.settled, TrexError::AlreadySettled);

        let escrow = &mut ctx.accounts.escrow.to_account_info();
        let winner = &mut ctx.accounts.winner.to_account_info();
        let admin = &mut ctx.accounts.admin.to_account_info();

        let total = **escrow.lamports.borrow();
        let expected = winner_amount.checked_add(admin_amount).ok_or(TrexError::MathOverflow)?;
        require!(expected <= total, TrexError::InsufficientEscrow);

        **winner.try_borrow_mut_lamports()? += winner_amount;
        **escrow.try_borrow_mut_lamports()? -= winner_amount;

        **admin.try_borrow_mut_lamports()? += admin_amount;
        **escrow.try_borrow_mut_lamports()? -= admin_amount;

        game.settled = true;
        Ok(())
    }

    pub fn cancel_game(ctx: Context<CancelGame>) -> Result<()> {
        let game = &mut ctx.accounts.game;
        require!(!game.settled, TrexError::AlreadySettled);

        let player_acc = &mut ctx.accounts.player.to_account_info();
        let escrow = &mut ctx.accounts.escrow.to_account_info();

        **player_acc.try_borrow_mut_lamports()? += **escrow.lamports.borrow();
        **escrow.try_borrow_mut_lamports()? = 0;

        game.settled = true;
        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(nonce: u8)]
pub struct InitializeGame<'info> {
    #[account(init, payer = player, space = 8 + 32 + 8 + 32 + 1 + 1)]
    pub game: Account<'info, GameState>,
    #[account(mut)]
    pub player: Signer<'info>,
    #[account(mut)]
    pub escrow: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SettleGame<'info> {
    #[account(mut, has_one = escrow)]
    pub game: Account<'info, GameState>,
    #[account(mut)]
    pub escrow: UncheckedAccount<'info>,
    #[account(mut)]
    pub winner: UncheckedAccount<'info>,
    #[account(mut)]
    pub admin: UncheckedAccount<'info>,
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct CancelGame<'info> {
    #[account(mut, has_one = escrow)]
    pub game: Account<'info, GameState>,
    #[account(mut)]
    pub escrow: UncheckedAccount<'info>,
    #[account(mut)]
    pub player: UncheckedAccount<'info>,
    pub authority: Signer<'info>,
}

#[account]
pub struct GameState {
    pub player: Pubkey,
    pub wager: u64,
    pub escrow: Pubkey,
    pub settled: bool,
    pub nonce: u8,
}

#[error_code]
pub enum TrexError {
    #[msg("Game already settled")]
    AlreadySettled,
    #[msg("Math overflow")]
    MathOverflow,
    #[msg("Insufficient escrow")]
    InsufficientEscrow,
}
