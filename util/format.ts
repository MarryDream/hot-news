// 获取 待推送目标 - qq 列表的映射表（这个 uid 共被哪些 qq 订阅了）
export function getTargetQQMap<T>( subs: Record<string, string>, format?: ( subStr: string ) => any ) {
	const target_qq_map = new Map<T, Set<string>>();

	for ( const qq in subs ) {
		let subStr = subs[qq];
		subStr = format ? format( subStr ) : subStr;

		try {
			const sub = JSON.parse( subStr );
			if ( !( Array.isArray( sub ) ) ) continue;
			sub.forEach( ( uid: T ) => {
				const qqList = target_qq_map.get( uid ) || new Set<string>();
				qqList.add( qq );
				target_qq_map.set( uid, qqList );
			} );
		} catch {}
	}

	return target_qq_map;
}