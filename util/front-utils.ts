/**
 * unix 时间戳转成可阅读的日期时间
 * @param unixTimestamp unix 时间戳
 * @param type <p>1时转为 yyyy年MM月dd日 hh:mm</p>
 *             <p>2时转为 yyyy-MM-dd hh:mm</p>
 * @return string
 */
export function toHumanize( unixTimestamp: number, type: number = 1 ): string {
	const date: Date = new Date( unixTimestamp * 1000 );
	const hour: number = date.getHours();
	const minute: number = date.getMinutes();
	const m: string = minute < 10 ? `0${ minute }` : `${ minute }`;
	const h: string = hour < 10 ? `0${ hour }` : `${ hour }`;
	
	return type === 1
		? `${ date.getFullYear() }年${ date.getMonth() + 1 }月${ date.getDate() }日 ${ h }:${ m }`
		: `${ date.getFullYear() }-${ date.getMonth() + 1 }-${ date.getDate() } ${ h }:${ m }`;
}

/**
 * 扒的处理过的js，故不好阅读，也不需要在意
 * @param width
 * @param height
 * @returns {{width, height}|{width: number, height: number}|{width: number, height: number}|{width: number, height: number}|*}
 */
export function getStyle( width: number, height: number ): { width: number, height: number } {
	let e = width
		, n = height;
	if ( e <= 120 || n <= 120 )
		return {
			width: 120,
			height: 120
		};
	if ( e <= 360 && n <= 280 )
		return {
			width: e,
			height: n
		};
	let r = e / n
		, i = n / e;
	if ( r <= 2 && i <= 2 && ( e > 360 || n > 280 ) ) {
		let a = e / 360
			, o = n / 280;
		return a > o ? {
			width: 360,
			height: n / a
		} : {
			width: e / o,
			height: 280
		}
	}
	if ( i > 3 )
		return {
			width: 140,
			height: 280
		};
	if ( ( r > 2 || i > 2 ) && ( e > 360 || n > 280 ) )
		return e / 360 > n / 280 ? {
			width: 360,
			height: 180
		} : {
			width: 140,
			height: 280
		};
	let s = {
		width: 320,
		height: 240
	};
	return e < 360 ? r >= 1 ? ( s.width = 180,
		s.height = s.width / r,
		s ) : r < .75 ? ( s.height = 240,
		s.width = s.height * r,
		s ) : ( s.width = 240,
		s.height = s.width / r,
		s ) : e > 960 ? r >= 1 ? ( s.width = 320,
		s.height = s.width / r,
		s ) : r < .75 ? ( s.width = 240,
		s.height = 320,
		s ) : ( s.width = 240,
		s.height = s.width / r,
		s ) : r >= 1 ? ( s.width = 240,
		s.height = s.width / r,
		s ) : r < .75 ? ( s.width = 240,
		s.height = 320,
		s ) : ( s.width = 240,
		s.height = s.width / r,
		s )
}


/**
 *int转RGB
 */
export function intToColor( argb: number ): string {
	let r: number, g: number, b: number;
	r = ( argb & 0xff0000 ) >> 16;
	g = ( argb & 0xff00 ) >> 8;
	b = ( argb & 0xff );
	return `rgb(${ r },${ g },${ b })`;
}