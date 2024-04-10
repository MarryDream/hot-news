import { InputParameter } from "@/modules/command";
import { bili_user_map } from "#/hot-news/util/constants";
import { getBiliLiveStatus } from "#/hot-news/util/api";

export async function getUpName( uid: number, { logger }: InputParameter ): Promise<string | null | undefined> {
	// 优先从初始化池中获取UP主名称
	const name = bili_user_map[uid];
	if ( name ) return name;
	
	try {
		const info = await getBiliLiveStatus( uid );
		return info?.name;
	} catch ( err ) {
		logger.warn( `获取B站[${ uid }]个人信息失败!`, err );
		return null;
	}
}