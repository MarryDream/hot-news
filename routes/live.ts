import { DB_KEY } from "#/hot-news/util/constants";
import express from "express";
import { getLiveUserInfo, getUpInfoFromArticle } from "#/hot-news/util/api";
import bot from "ROOT";
import { LiveUserInfo, UpCardInfo } from "#/hot-news/types/type";

export default express.Router().get( "/", async ( req, res ) => {
	const uid: number = parseInt( <string>req.query.uid );
	const cache = await bot.redis.getString( `${ DB_KEY.bili_live_status_key }.${ uid }` );
	const liveInfo = JSON.parse( cache );
	const user_info: LiveUserInfo | undefined = await getLiveUserInfo( uid );
	let vip_status: number | undefined;
	if ( user_info && user_info.official_type === 0 ) {
		const card: UpCardInfo | undefined = await getUpInfoFromArticle( uid, "//www.bilibili.com" );
		vip_status = card?.vip_status;
	}
	res.send( {
		...liveInfo,
		...user_info,
		vip_status
	} );
} );