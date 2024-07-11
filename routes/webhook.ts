import express from "express";
import bot from "ROOT";
import { DB_KEY } from "#/hot-news/util/constants";
import hmacSHA256 from 'crypto-js/hmac-sha256';
import Base64 from 'crypto-js/enc-base64';
import { MessageType } from "@/modules/message";
import { MessageMethod } from "#/hot-news/module/message/MessageMethod";


export default express.Router().post( "/", async ( req, res ) => {
	const body = req.body;
	const { from, content, sign, timestamp } = body;
	// 时间戳相错2分钟以上则认为是非法请求
	if ( Date.now() - timestamp > 120000 ) return res.status( 401 ).send( "Invalid signature" );
	
	const token = req.query.token;
	if ( !token ) return res.status( 401 ).send( "Invalid token" );
	
	const token_map = await bot.redis.getHash( DB_KEY.sms_key );
	for ( let qq in token_map ) {
		if ( token_map[qq] === token ) {
			const secret = await bot.redis.getHashField( DB_KEY.sms_secret, qq );
			if ( !secret ) return res.status( 401 ).send( "Invalid token" );
			
			const hashDigest = hmacSHA256( `${ timestamp }\n${ secret }`, secret );
			const hash_base64 = Base64.stringify( hashDigest );
			const my_sign = encodeURIComponent( hash_base64 );
			if ( sign !== my_sign ) return res.status( 401 ).send( "Invalid signature" );
			const msg = `收到来自 ${ from } 的消息\n${ content }`;
			await MessageMethod.sendMsg( MessageType.Private, qq, msg );
			return res.send( "success" );
		}
	}
	
	return res.status( 401 ).send( "Invalid token" );
} );