import * as dn from "dnum"
import { format } from "path";

export const PRECISION_SCALE = BigInt(10 ** 4);

function formatTokenAmount(value: string | number, decimals: number) {
    const num  = [BigInt(value), decimals] as dn.Dnum
    
    return dn.format(num)
}

function calculateFees(stakeAmount: string, fee: string, tokenDecimals: number) {
    const dividend = BigInt(stakeAmount) * BigInt(fee)
    const divisor = BigInt(100) * PRECISION_SCALE

    const result = dividend/divisor
    const num  = [result, tokenDecimals] as dn.Dnum


   return dn.format(num)

}

export {calculateFees, formatTokenAmount, dn} 