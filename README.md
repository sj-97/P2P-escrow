# P2P-escrow

## Important files 
- programs/escrow/src/lib.rs
- tests/escrow.ts

## Running the code
1. anchor build
2. anchor deploy --provider.cluster devnet
3. anchor test

## Note
The test code uses pre-built accounts to avoid creating random accounts everytime - increasing testing time.

