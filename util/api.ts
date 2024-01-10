import axios, { AxiosError } from "axios";
import bot from 'ROOT';
import { formatDate, get_uuid, random_png_end } from "#/hot-news/util/tools";
import { DB_KEY } from "#/hot-news/util/constants";
import { BiliDynamicCard, BiliLiveInfo, BiliOpusDetail, LiveUserInfo, News, UpCardInfo } from "#/hot-news/types/type";
import moment from "moment";
import { config } from "#/hot-news/init";
import fetch, { Response } from "node-fetch";
import UserAgent from 'user-agents';

const API = {
	sina: 'https://www.anyknew.com/api/v1/sites/sina',
	baidu: 'https://www.anyknew.com/api/v1/sites/baidu',
	zhihu: 'https://www.anyknew.com/api/v1/sites/zhihu',
	wangyi: 'https://www.anyknew.com/api/v1/sites/163',
	toutiao: 'https://www.anyknew.com/api/v1/sites/toutiao',
	biliDynamic: "https://api.bilibili.com/x/polymer/web-dynamic/v1/feed/space",
	biliInfo: 'https://api.bilibili.com/x/space/acc/info',
	bili_live_status: 'https://api.live.bilibili.com/room/v1/Room/get_status_info_by_uids',
	moyu: 'https://api.vvhan.com/api/moyu?type=json',
	moyu2: 'https://api.j4u.ink/proxy/redirect/moyu/calendar/$.png',
	"60s": 'https://api.vvhan.com/api/60s',
	biliCard: "https://api.bilibili.com/x/web-interface/card",
	biliStat: "https://api.bilibili.com/x/relation/stat",
	biliLiveUserInfo: "https://api.live.bilibili.com/live_user/v1/Master/info",
	biliOpusDetail: "https://api.bilibili.com/x/polymer/web-dynamic/v1/opus/detail",
}

const NEWS_HEADERS = {
	"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.75 Safari/537.36",
	"Referer": "https://www.anyknew.com/",
	"Accept": "*/*",
	"Accept-Encoding": "gzip, deflate, br",
	"Connection": "keep-alive",
};

const BILIBILI_DYNAMIC_HEADERS = {
	"Origin": "https://space.bilibili.com",
	"Referer": "https://space.bilibili.com/$/dynamic",
	"User-Agent": "Mozilla/5.0",
	"Cookie": ""
}

const userAgent = new UserAgent( [ { deviceCategory: 'desktop' }, /Safari|Chrome|FireFox|Edg/ ] );

export const getNews: ( channel?: string ) => Promise<string> = async ( channel: string = 'toutiao' ) => {
	let date = formatDate( new Date() );
	let key = `hot_news.news.${ channel }.${ date }`;
	let news = await bot.redis.getString( key );
	if ( news ) {
		return Promise.resolve( news );
	}
	
	return new Promise( ( resolve, reject ) => {
		axios.get( API[channel], { headers: NEWS_HEADERS, timeout: 5000 } ).then( res => {
			if ( res.status !== 200 ) {
				bot.logger.error( `获取[${ channel }]热点新闻失败: ${ res.statusText }` )
				reject( '获取热点新闻失败' )
				return;
			}
			
			if ( res.data.status !== 0 ) {
				bot.logger.error( `获取[${ channel }]热点新闻失败: ${ res.data.msg }` )
				reject( '获取热点新闻失败' )
				return;
			}
			
			const {
				site: {
					attrs: { cn },
					subs: [ { items } ]
				}
			}: News = res.data.data;
			
			news = items.map( ( value, index ) => `${ index + 1 }. ` + value.title ).join( "\n" );
			news = `-- ${ date } --${ cn }\n` + news;
			
			bot.redis.setString( key, news, 3600 ).catch( reason => bot.logger.warn( reason ) );
			
			resolve( news );
		} ).catch( err => {
			reject( err )
		} )
	} );
}

/**
 * 获取B站指纹Cookie
 */
async function getCookies(): Promise<void> {
	BILIBILI_DYNAMIC_HEADERS.Cookie = `_uuid=${ get_uuid() }`
	const resp = await axios.get( `https://api.bilibili.com/x/frontend/finger/spi`, {
		headers: BILIBILI_DYNAMIC_HEADERS
	} );
	if ( resp.data.code !== 0 ) {
		bot.logger.error( `[hot-news] 获取B站指纹出错:`, resp.data );
		return;
	}
	BILIBILI_DYNAMIC_HEADERS.Cookie += `;buvid3=${ resp.data.data["b_3"] }`;
}

/**
 * 上报并激活指纹Cookie
 */
async function submitGateway(): Promise<void> {
	await axios.post( "https://api.bilibili.com/x/internal/gaia-gateway/ExClimbWuzhi", {
		payload: JSON.stringify( {
			'3064': 1,
			'39c8': `333.999.fp.risk`,
			'3c43': {
				'adca': BILIBILI_DYNAMIC_HEADERS["User-Agent"].includes( "Windows" ) ? "Win32" : "Linux",
				'bfe9': random_png_end()
			}
		} )
	}, {
		headers: BILIBILI_DYNAMIC_HEADERS
	} )
}

/**
 * 获取B站空间动态列表
 */
export const getBiliDynamicNew: ( uid: number, no_cache?: boolean, cache_time?: number ) => Promise<BiliDynamicCard[]> = async ( uid, no_cache = false, cache_time = 60 ) => {
	const dynamic = await bot.redis.getString( `${ DB_KEY.bili_dynamic_key }.${ uid }` );
	if ( dynamic ) {
		return Promise.resolve( JSON.parse( dynamic ) );
	}
	
	// 每次请求前随机生成个UA
	BILIBILI_DYNAMIC_HEADERS["User-Agent"] = userAgent.random().toString();
	BILIBILI_DYNAMIC_HEADERS.Referer = BILIBILI_DYNAMIC_HEADERS.Referer.replace( /\$|\d+/, `${ uid }` );
	
	// 获取Cookie
	if ( !config.cookie ) {
		await getCookies();
		await submitGateway();
	} else {
		BILIBILI_DYNAMIC_HEADERS.Cookie = config.cookie;
	}
	
	// 已经发布的动态ID
	const dynamicIdList: string[] = await bot.redis.getSet( `${ DB_KEY.bili_dynamic_ids_key }.${ uid }` );
	return new Promise( ( resolve ) => {
		axios.get( API.biliDynamic, {
			params: {
				offset: '',
				host_mid: uid,
				timezone_offset: -480,
				platform: 'web',
				features: "itemOpusStyle,listOnlyfans,opusBigCover,onlyfansVote",
				web_location: "333.999"
			},
			timeout: 5000,
			headers: BILIBILI_DYNAMIC_HEADERS
		} ).then( r => {
			const data = r.data;
			if ( data.code !== 0 ) {
				bot.logger.error( `获取B站[${ uid }]动态失败,code is [${ data.code }], reason: ${ data.message || data.msg }` );
				resolve( [] );
				return;
			}
			
			const { items }: { items: BiliDynamicCard[] } = data.data;
			let filter_items: BiliDynamicCard[];
			// 无法显示消息、历史消息、以及自定义过滤内容过滤掉
			const filterDynamicType = config.filterDynamicType;
			const reg = new RegExp( config.filterContent );
			filter_items = items
				// 过滤已缓存的ID
				.filter( c => !dynamicIdList.includes( c.id_str ) && c.visible )
				// 过滤全部类型动态的文字内容
				.filter( c => {
					return config.filterContent ? !new RegExp( config.filterContent ).test( c.modules.module_dynamic.desc?.text || "" ) : true;
				} )
				// 按动态类型进行不同的匹配方式(主要处理转发类型)
				.filter( card => {
					if ( filterDynamicType.length === 0 ) {
						return true;
					}
					for ( let value of filterDynamicType ) {
						let result: boolean = true;
						// 转发动态去匹配原动态内容及tag
						if ( card.type === value.type && value.type === 'DYNAMIC_TYPE_FORWARD' ) {
							const richTextNodes = card.orig!.modules.module_dynamic.desc?.rich_text_nodes || [];
							const text = card.orig!.modules.module_dynamic.desc?.text || "";
							const content: string = richTextNodes?.map( node => node.text ).join() + text;
							result = value.reg ?
								!new RegExp( value.reg ).test( content )
								: false;
						} else if ( card.type === value.type ) {
							// 其他类型动态暂且只匹配动态的文字内容及tag
							result = value.reg ? !new RegExp( value.reg ).test( card.modules.module_dynamic.desc?.text || "" ) : false;
						} else {
							result = true;
						}
						if ( !result ) {
							bot.logger.info( "保存已过滤的消息: ", card.id_str, "触发的规则是：", filterDynamicType );
							if ( !dynamicIdList.includes( card.id_str ) ) {
								bot.redis.addSetMember( `${ DB_KEY.bili_dynamic_ids_key }.${ uid }`, card.id_str );
								dynamicIdList.push( card.id_str );
							}
							return false;
						}
					}
					return true;
				} );
			
			// 把过滤掉的消息ID保存，避免后续查询因为触发反爬虫导致又被推送
			items.filter( c => !dynamicIdList.includes( c.id_str )
				&& c.visible
				&& reg.test( c.modules.module_dynamic.desc?.text || "" ) ).forEach( value => {
				bot.logger.info( "保存已过滤的消息: ", value.id_str, "触发的规则是：", `${ config.filterContent }` );
				bot.redis.addSetMember( `${ DB_KEY.bili_dynamic_ids_key }.${ uid }`, value.id_str );
			} );
			
			if ( filter_items.length > 0 ) {
				resolve( filter_items );
				if ( !no_cache ) {
					bot.redis.setString( `${ DB_KEY.bili_dynamic_key }.${ uid }`, JSON.stringify( filter_items ), cache_time );
				}
			} else {
				resolve( [] );
				if ( !no_cache ) {
					bot.redis.setString( `${ DB_KEY.bili_dynamic_key }.${ uid }`, "[]", cache_time );
				}
			}
		} ).catch( ( reason ): any => {
			if ( axios.isAxiosError( reason ) ) {
				let err = <AxiosError>reason;
				bot.logger.error( `获取B站[${ uid }]动态失败(axiosError), reason: ${ err.message }` );
			} else {
				bot.logger.error( `获取B站[${ uid }]动态失败, reason:`, reason );
			}
			resolve( [] )
		} )
	} );
}

/**
 * @deprecated
 * @param uid 订阅的uid
 * @param no_cache 是否用缓存
 * @param cache_time 缓存时间
 */
export const getBiliLive: ( uid: number, no_cache?: boolean, cache_time?: number ) => Promise<BiliLiveInfo> = async ( uid, no_cache = false, cache_time = 60 ) => {
	const live_info = await bot.redis.getString( `${ DB_KEY.bili_live_info_key }.${ uid }` );
	if ( live_info ) {
		return Promise.resolve( JSON.parse( live_info ) );
	}
	
	BILIBILI_DYNAMIC_HEADERS.Referer = `https://space.bilibili.com/${ uid }`;
	return new Promise( ( resolve ) => {
		axios.get( API.biliInfo, {
			params: {
				mid: uid,
				jsonp: 'jsonp',
				platform: 'web',
				token: ''
			},
			headers: BILIBILI_DYNAMIC_HEADERS,
			timeout: 5000
		} ).then( r => {
			if ( r.data.code !== 0 ) {
				bot.logger.error( `获取B站[${ uid }]个人信息失败,code is [${ r.data.code }], reason: ${ r.data.message || r.data.msg }` );
				return;
			}
			
			const { name, live_room } = r.data.data;
			const info = { name, liveRoom: live_room };
			info.liveRoom.live_time = 0;
			resolve( info );
			if ( !no_cache ) {
				bot.redis.setString( `${ DB_KEY.bili_live_info_key }.${ uid }`, JSON.stringify( info ), cache_time );
			}
		} ).catch( ( reason ): any => {
			if ( axios.isAxiosError( reason ) ) {
				let err = <AxiosError>reason;
				bot.logger.error( `获取B站[${ uid }]个人信息失败(axiosError), reason: ${ err.message }` );
			} else {
				bot.logger.error( `获取B站[${ uid }]个人信息失败, reason:`, reason );
			}
			const info = {
				liveRoom: {
					liveStatus: -1,
					roomStatus: 1,
					title: "",
					url: `https://live.bilibili.com/`,
					cover: "",
					live_time: 0,
					watched_show: {
						switch: true,
						num: 0,
						text_small: "",
						text_large: ""
					},
					room_id: 0,
					short_id: 0,
					area_name: '',
					area_v2_name: '',
					area_v2_parent_name: '',
					face: '',
					tag_name: ''
				},
				name: uid.toString( 10 )
			}
			resolve( info );
		} )
	} );
}

/**
 * 获取直播间状态的 API
 * @param uid
 * @param no_cache
 * @param cache_time
 */
export const getBiliLiveStatus: ( uid: number, no_cache?: boolean, cache_time?: number ) => Promise<BiliLiveInfo> = async ( uid, no_cache = false, cache_time = 60 ) => {
	const live_info = await bot.redis.getString( `${ DB_KEY.bili_live_status_key }.${ uid }` );
	if ( live_info ) {
		return Promise.resolve( JSON.parse( live_info ) );
	}
	
	return new Promise( ( resolve ) => {
		axios.get( API.bili_live_status, {
			params: {
				"uids[]": uid
			},
			headers: BILIBILI_DYNAMIC_HEADERS,
			timeout: 5000
		} ).then( r => {
			if ( r.data.code !== 0 ) {
				bot.logger.error( `获取B站[${ uid }]直播间状态失败,code is [${ r.data.code }], reason: ${ r.data.message || r.data.msg }` );
				return;
			}
			
			if ( Array.isArray( r.data.data ) ) {
				const info = {
					liveRoom: {
						liveStatus: -1,
						roomStatus: 1,
						title: "",
						url: `https://live.bilibili.com/`,
						cover: "",
						live_time: 0,
						watched_show: {
							switch: true,
							num: 0,
							text_small: "",
							text_large: ""
						},
						room_id: 0,
						short_id: 0,
						area_name: '',
						area_v2_name: '',
						area_v2_parent_name: '',
						face: '',
						tag_name: ''
					},
					name: uid.toString( 10 )
				}
				resolve( info );
				return;
			}
			
			const {
				title,
				uname,
				online,
				live_status,
				live_time,
				cover_from_user,
				room_id,
				short_id,
				area_name,
				area_v2_name,
				area_v2_parent_name,
				face,
				tag_name
			} = r.data.data[uid];
			const info = {
				liveRoom: {
					liveStatus: live_status,
					roomStatus: 1,
					title,
					url: `https://live.bilibili.com/${ short_id === 0 ? room_id : short_id }`,
					cover: cover_from_user,
					live_time,
					watched_show: {
						switch: true,
						num: online,
						text_small: "",
						text_large: ""
					},
					room_id,
					short_id,
					area_name,
					area_v2_name,
					area_v2_parent_name,
					face,
					tag_name
				},
				name: uname
			}
			resolve( info );
			if ( !no_cache ) {
				bot.redis.setString( `${ DB_KEY.bili_live_status_key }.${ uid }`, JSON.stringify( info ), cache_time );
			}
		} ).catch( ( reason ): any => {
			if ( axios.isAxiosError( reason ) ) {
				let err = <AxiosError>reason;
				bot.logger.error( `获取B站[${ uid }]直播间状态失败(axiosError), reason: ${ err.message }` );
			} else {
				bot.logger.error( `获取B站[${ uid }]直播间状态失败, reason:`, reason );
			}
			const info = {
				liveRoom: {
					liveStatus: -1,
					roomStatus: 1,
					title: "",
					url: `https://live.bilibili.com/`,
					cover: "",
					live_time: 0,
					watched_show: {
						switch: true,
						num: 0,
						text_small: "",
						text_large: ""
					},
					room_id: 0,
					short_id: 0,
					area_name: '',
					area_v2_name: '',
					area_v2_parent_name: '',
					face: '',
					tag_name: ''
				},
				name: uid.toString( 10 )
			}
			resolve( info );
		} )
	} );
}

export async function getMoyuImg(): Promise<string> {
	let date = formatDate( new Date() );
	let key = `${ DB_KEY.moyu_img_url_key }.${ date }`;
	const url = await bot.redis.getString( key );
	if ( url ) {
		return url;
	}
	
	let baseurl: string = API.moyu;
	let headers = {};
	if ( config.vvhanCdn ) {
		baseurl = baseurl.replace( "https://api.vvhan.com", config.vvhanCdn );
		headers = {
			"Referer": "https://hibennett.cn/?bot=SilveryStar/Adachi-BOT&plugin=hot-news&version=v1"
		}
	}
	
	return new Promise( resolve => {
		axios.get( baseurl, { timeout: 5000, headers } )
			.then( response => {
				if ( response.data.success ) {
					const imgUrl = response.data.url;
					resolve( imgUrl );
					bot.redis.setString( key, imgUrl, 3600 );
				}
			} ).catch( ( reason ): any => {
			if ( axios.isAxiosError( reason ) ) {
				let err = <AxiosError>reason;
				bot.logger.error( `获取摸鱼日报失败(axiosError), reason: ${ err.message }` );
			} else {
				bot.logger.error( "获取摸鱼日报失败, reason:", reason );
			}
		} )
	} );
}

export function getMoyuUrl(): string {
	const today: string = moment().format( "yyMMDD" );
	return API.moyu2.replace( "$", today );
}

export async function get60s(): Promise<string> {
	const today: string = formatDate( new Date(), "" );
	let api = API["60s"].replace( "$", today );
	if ( !config.vvhanCdn ) {
		return Promise.resolve( `${ API['60s'] }?ts=${ today }` );
	}
	api = api.replace( "https://api.vvhan.com", config.vvhanCdn );
	let key = `${ DB_KEY["60s_img_url_key"] }.${ today }`;
	const url = await bot.redis.getString( key );
	if ( url ) {
		return url;
	}
	
	const headers = {
		"Referer": "https://hibennett.cn/?bot=SilveryStar/Adachi-BOT&plugin=hot-news&version=v1"
	}
	
	return new Promise( ( resolve, reject ) => {
		axios.get( api, { params: { type: 'json' }, timeout: 10000, headers } )
			.then( response => {
				if ( response.data.success ) {
					const imgUrl = response.data.imgUrl;
					resolve( imgUrl );
					bot.redis.setString( key, imgUrl, 3600 );
				}
			} ).catch( ( reason ): any => {
			if ( axios.isAxiosError( reason ) ) {
				let err = <AxiosError>reason;
				bot.logger.error( `获取60秒新闻图失败(axiosError), reason: ${ err.message }` );
				reject( err.message );
			} else {
				bot.logger.error( "获取60s新闻图失败, reason:", reason );
				reject( reason );
			}
		} )
	} );
}

export async function getUpInfoFromArticle( uid: number, jump_url: string ): Promise<UpCardInfo | undefined> {
	try {
		const result: Response = await fetch( `${ API.biliCard }?mid=${ uid }&article=true`, {
			headers: {
				origin: "https://www.bilibili.com",
				referer: `https:${ jump_url }?spm_id_from=333.999.list.card_opus.click`
			},
			method: "GET"
		} );
		const data = await result.json();
		if ( data.code === 0 ) {
			const { follower, article_count, card: { vip: { status } } } = data.data;
			return Promise.resolve( {
				follower,
				article_count,
				vip_status: status
			} );
		}
	} catch ( e ) {
		bot.logger.error( `[hot-news] 获取UP:${ uid } 的数据失败`, e );
	}
}

export async function getArticleHtml( jump_url: string ): Promise<string> {
	const ua = userAgent.random().toString();
	const response: Response = await fetch( `https:${ jump_url }`, {
		headers: {
			"user-agent": ua
		}
	} );
	return await response.text();
}

/**
 * 过渡版本接口(暂时先不用)
 * @param opus_id 动态ID
 */
export async function getOpusDetail( opus_id: string ): Promise<BiliOpusDetail> {
	const resp = await axios.get( API.biliOpusDetail, {
		params: {
			id: opus_id,
			timezone_offset: new Date().getTimezoneOffset()
		},
		timeout: 10000
	} );
	if ( resp.data.code !== 0 ) {
		return Promise.reject( resp.data.message );
	}
	
	return resp.data.data.item;
}

export async function getUpStat( uid: number ): Promise<{ follower: number } | undefined> {
	try {
		const response: Response = await fetch( `${ API.biliStat }?vmid=${ uid }&jsonp=jsonp` );
		const data = await response.json();
		if ( data.code === 0 ) {
			const { follower } = data.data;
			return Promise.resolve( {
				follower
			} );
		}
		bot.logger.error( `[hot-news] 获取UP: ${ uid } 状态数据失败, reason: ${ data.message }` );
	} catch ( e ) {
		bot.logger.error( `[hot-news] 获取UP: ${ uid } 状态数据失败`, e );
	}
}

export async function getLiveUserInfo( uid: number ): Promise<LiveUserInfo | undefined> {
	try {
		const response: Response = await fetch( `${ API.biliLiveUserInfo }?uid=${ uid }` );
		const data = await response.json();
		if ( data.code === 0 ) {
			const {
				exp: { master_level: { level, color } },
				follower_num,
				info: { official_verify: { type }, uname }
			} = data.data;
			return Promise.resolve( {
				follower_num,
				level,
				color,
				official_type: type,
				uname
			} );
		}
		bot.logger.error( `[hot-news] 获取UP: ${ uid } 状态数据失败, reason: ${ data.message }` );
	} catch ( e ) {
		bot.logger.error( `[hot-news] 获取UP: ${ uid } 状态数据失败`, e );
	}
}