import * as dn from "dnum"

export const PRECISION_SCALE = BigInt(10 ** 4);

function formatTokenAmount(value: string | number, decimals: number) {
    const num  = [BigInt(value), decimals] as const
    
    return dn.format(num)
}

function calculateFees(stakeAmount: string, fee: string, tokenDecimals: number) {
    const dividend = BigInt(stakeAmount) * BigInt(fee)
    const divisor = BigInt(100) * PRECISION_SCALE

    const result = dividend/divisor
    const num  = [result, tokenDecimals] as dn.Dnum


   return dn.format(num)

}

function gte(value1: bigint | undefined, value2: bigint  | undefined, decimals: number | string) : boolean {
    if(!value1 || !value2 || !decimals){
        return false
    }
    const v1 = [value1, Number(decimals)] as dn.Numberish;
    const v2 = [value2, Number(decimals)] as dn.Numberish;
    
    return dn.greaterThan(v1, v2) || dn.equal(v1, v2);
}

export {calculateFees, formatTokenAmount, gte, dn} 