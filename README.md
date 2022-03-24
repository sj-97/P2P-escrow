# P2P-escrow

## Instructions
- init_contract:  Set all the constraints
- deposit_asset: Add new asset and check if the user has satisfied all constraints
- withdraw_asset: Check constraints are satisfied and allow user to withdraw appropriate assets
- swap: Change ownership of each asset

## Instruction Flow
1. Contract is initiated (init_contract)
2. User1 deposits the required asset of type A (deposit_asset)
3. User2 deposits the required asset of type B (deposit_asset)
4. the assets owners are swapped (swap)
5. User1 withdraws asset of type B (withdraw_asset)
6. User2 withdraws asset of type A (withdraw_asset)

The order for steps 2 & 3 and for steps 5 & 6 is not fixed. That is, any user can deposit/ withdraw first.

## Architecture
![alt text](https://github.com/sj-97/P2P-escrow/blob/master/arch.png?raw=true)

## Important files 
- programs/escrow/src/lib.rs
- tests/escrow.ts

## Running the code
1. anchor build
2. anchor deploy --provider.cluster devnet
3. anchor test

## Note
The test code uses pre-built accounts to avoid creating random accounts everytime - increasing testing time.

