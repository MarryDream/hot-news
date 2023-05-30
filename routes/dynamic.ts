import express from "express";
import { getArticleHtml, getUpInfoFromArticle, getUpStat } from "#hot-news/util/api";
import { BiliDynamicMajorArticle, BiliDynamicMajorOpus } from "#hot-news/types/type";
import bot from "ROOT";
import { DB_KEY } from "#hot-news/util/constants";

export default express.Router().get( "/", async ( req, res ) => {
	const dynamicId: string = <string>req.query.dynamicId;
	const cache = await bot.redis.getString( `${ DB_KEY.bili_dynamic_info_key }.${ dynamicId }` );
	const card = JSON.parse( cache );
	if ( card.type === 'DYNAMIC_TYPE_ARTICLE' ) {
		let jump_url = "";
		if ( card.modules.module_dynamic.major?.type === 'MAJOR_TYPE_ARTICLE' ) {
			const article = ( <BiliDynamicMajorArticle>card.modules.module_dynamic.major ).article;
			jump_url = article.jump_url;
		} else if ( card.modules.module_dynamic.major?.type === 'MAJOR_TYPE_OPUS' ) {
			const opus = ( <BiliDynamicMajorOpus>card.modules.module_dynamic.major ).opus;
			jump_url = opus.jump_url;
		}
		const up_info = await getUpInfoFromArticle( card.modules.module_author.mid, jump_url );
		
		// 获取文章的内容
		const data: string = await getArticleHtml( jump_url );
		
		res.send( {
			...card,
			...up_info,
			articleHtml: data,
			jump_url
		} )
		return;
	} else if ( card.type === 'DYNAMIC_TYPE_AV' ) {
		const data = await getUpStat( card.modules.module_author.mid );
		res.send( {
			...card,
			...data
		} )
		return;
	}
	res.send( card );
} );