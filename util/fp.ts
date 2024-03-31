class Murmur3 {
	static readonly MOD: bigint = 1n << 64n;
	private static readonly C1: bigint = 0x87C3_7B91_1142_53D5n;
	private static readonly C2: bigint = 0x4CF5_AD43_2745_937Fn;
	private static readonly C3: bigint = 0x52DC_E729n;
	private static readonly C4: bigint = 0x3849_5AB5n;
	private static readonly R1: bigint = 27n;
	private static readonly R2: bigint = 31n;
	private static readonly R3: bigint = 33n;
	private static readonly M: bigint = 5n;
	
	static hash( source: Uint8Array, seed: number ): bigint {
		let h1: bigint = BigInt( seed );
		let h2: bigint = BigInt( seed );
		let processed: number = 0;
		
		for ( let i = 0; i < source.length; i += 16 ) {
			const chunk: Uint8Array = source.slice( i, i + 16 );
			processed += chunk.length;
			if ( chunk.length === 16 ) {
				const k1: bigint = BigInt( chunk.slice( 0, 8 ).reduce( ( acc, val, idx ) => acc | BigInt( val ) << BigInt( 8 * idx ), 0n ) );
				const k2: bigint = BigInt( chunk.slice( 8 ).reduce( ( acc, val, idx ) => acc | BigInt( val ) << BigInt( 8 * idx ), 0n ) );
				h1 ^= ( Murmur3.rotateLeft( k1 * Murmur3.C1 % Murmur3.MOD, Murmur3.R2 ) * Murmur3.C2 ) % Murmur3.MOD;
				h1 = ( ( Murmur3.rotateLeft( h1, Murmur3.R1 ) + h2 ) * Murmur3.M + Murmur3.C3 ) % Murmur3.MOD;
				h2 ^= Murmur3.rotateLeft( k2 * Murmur3.C2 % Murmur3.MOD, Murmur3.R3 ) * Murmur3.C1 % Murmur3.MOD;
				h2 = ( ( Murmur3.rotateLeft( h2, Murmur3.R2 ) + h1 ) * Murmur3.M + Murmur3.C4 ) % Murmur3.MOD;
			} else {
				let k1: bigint = 0n;
				let k2: bigint = 0n;
				for ( let j = 0; j < chunk.length; j++ ) {
					const byteVal: bigint = BigInt( chunk[j] );
					if ( j < 8 ) {
						k1 |= byteVal << BigInt( 8 * j );
					} else {
						k2 |= byteVal << BigInt( 8 * ( j - 8 ) );
					}
				}
				k1 = ( Murmur3.rotateLeft( k1 * Murmur3.C1 % Murmur3.MOD, Murmur3.R2 ) * Murmur3.C2 ) % Murmur3.MOD;
				h1 ^= k1;
				h2 ^= Murmur3.rotateLeft( k2 * Murmur3.C2 % Murmur3.MOD, Murmur3.R3 ) * Murmur3.C1 % Murmur3.MOD;
			}
		}
		
		h1 ^= BigInt( processed );
		h2 ^= BigInt( processed );
		h1 = ( h1 + h2 ) % Murmur3.MOD;
		h2 = ( h2 + h1 ) % Murmur3.MOD;
		h1 = Murmur3.fmix64( h1 );
		h2 = Murmur3.fmix64( h2 );
		h1 = ( h1 + h2 ) % Murmur3.MOD;
		h2 = ( h2 + h1 ) % Murmur3.MOD;
		
		return ( h2 << BigInt( 64 ) ) | h1;
	}
	
	private static rotateLeft( x: bigint, k: bigint ): bigint {
		const index = Number( k );
		const binStr: string = x.toString( 2 ).padStart( 64, "0" );
		return BigInt( `0b${ binStr.slice( index ) }${ binStr.slice( 0, index ) }` );
	}
	
	private static fmix64( k: bigint ): bigint {
		const C1: bigint = 0xFF51_AFD7_ED55_8CCDn;
		const C2: bigint = 0xC4CE_B9FE_1A85_EC53n;
		const R: number = 33;
		let tmp: bigint = k;
		tmp ^= tmp >> BigInt( R );
		tmp = ( tmp * C1 ) % Murmur3.MOD;
		tmp ^= tmp >> BigInt( R );
		tmp = ( tmp * C2 ) % Murmur3.MOD;
		tmp ^= tmp >> BigInt( R );
		return tmp;
	}
}

export function gen_buvid_fp( key: string, seed: number ): string {
	const source: Uint8Array = new TextEncoder().encode( key );
	const m: bigint = Murmur3.hash( source, seed );
	return `${ ( m & ( Murmur3.MOD - 1n ) ).toString( 16 ) }${ ( m >> 64n ).toString( 16 ) }`;
}
