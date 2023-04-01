import { RefreshCatch } from "@modules/management/refresh";
import { PluginAlias } from "@modules/plugin";
import { installDep } from "#hot-news/util/tools";
import bot from "ROOT";

export default class NewsConfig {
	/** 用户的最大订阅数量 */
	public maxSubscribeNum: number;
	/** B站动态查询定时任务规则 */
	public biliDynamicScheduleRule: string;
	/** B站直播查询定时任务规则 */
	public biliLiveScheduleRule: string;
	/** B站动态API信息缓存时间（秒），该时间必须小于动态的轮询间隔时间 */
	public biliDynamicApiCacheTime: number;
	/** B站直播API信息缓存时间（秒），该时间必须小于动态的轮询间隔时间 */
	public biliLiveApiCacheTime: number;
	/** B站动态截图缓存时间（秒），该时间必须小于动态的轮询间隔时间 */
	public biliScreenshotCacheTime: number;
	/** B站直播状态缓存时间（小时），在此时间内不会再次推送该直播间 */
	public biliLiveCacheTime: number;
	/** B站直播推送的模版消息 */
	public liveTemplate: string;
	/** B站常规动态推送的模版消息 */
	public dynamicTemplate: string;
	/** B站专栏动态推送的模版消息 */
	public articleDynamicTemplate: string;
	/** B站视频动态推送的模版消息 */
	public videoDynamicTemplate: string;
	/** B站动态截图渲染失败的模版消息 */
	public errorMsgTemplate: string;
	public static init = {
		maxSubscribeNum: 5,
		biliDynamicScheduleRule: "0 * * * * *",
		biliLiveScheduleRule: "0 * * * * *",
		biliDynamicApiCacheTime: 55,
		biliLiveApiCacheTime: 55,
		biliScreenshotCacheTime: 55,
		biliLiveCacheTime: 20,
		liveTemplate: "【直播通知】\n${name}开播啦!\n标题：${title}\n在线人气：${num}\n开播时长：${liveTime}\n直播间：${url}\n${img}",
		dynamicTemplate: "【动态通知】\n${name}发布新动态了!\n动态地址：${url}\n${img}",
		articleDynamicTemplate: "【动态通知】\n${name}发布新动态了!\n动态地址：${url}\n ${desc}",
		videoDynamicTemplate: "【投稿通知】\n${name}发布新的投稿视频了!\n标题：${archive.title}\n简介：${archive.desc}\n视频地址：${archive.jump_url}\n${img}",
		errorMsgTemplate: "${name}发布新动态了\n动态地址：${url}\n\n图片渲染出错了，请自行前往B站查看最新动态。",
		screenshotType: 1,
		subscribeMoyu: {
			enable: false,
			cronRule: "0 0 9 * * *",
			apiType: 1
		},
		pushLimit: {
			enable: true,
			limitTimes: 3,
			limitTime: 1
		},
		vvhanCdn: "",
		aliases: [ "消息订阅", "新闻订阅", "热点新闻" ],
		filterContent: "恭喜.*中奖"
	};
	/** 订阅摸鱼日报 */
	public subscribeMoyu: {
		enable: boolean;
		cronRule: string;
		apiType: number;
	}
	/** 消息推送限制配置 */
	public pushLimit: {
		enable: boolean;
		limitTimes: number;
		limitTime: number;
	}
	/** vvhan.com的CDN配置 */
	public vvhanCdn: string;
	/** 渲染图类型：1是直接截B站图，2使用自定义带二维码的渲染图 */
	public screenshotType: number;
	/** 更新使用的别名 */
	public aliases: string[];
	/** 需要被过滤的动态内容(正则表达式) */
	public filterContent: string;
	
	constructor( config: any ) {
		this.maxSubscribeNum = config.maxSubscribeNum;
		this.biliDynamicScheduleRule = config.biliDynamicScheduleRule;
		this.biliLiveScheduleRule = config.biliLiveScheduleRule;
		this.biliDynamicApiCacheTime = config.biliDynamicApiCacheTime;
		this.biliLiveApiCacheTime = config.biliLiveApiCacheTime;
		this.biliScreenshotCacheTime = config.biliScreenshotCacheTime;
		this.biliLiveCacheTime = config.biliLiveCacheTime;
		this.liveTemplate = config.liveTemplate;
		this.dynamicTemplate = config.dynamicTemplate;
		this.articleDynamicTemplate = config.articleDynamicTemplate;
		this.videoDynamicTemplate = config.videoDynamicTemplate;
		this.errorMsgTemplate = config.errorMsgTemplate;
		this.screenshotType = config.screenshotType;
		this.subscribeMoyu = {
			enable: config.subscribeMoyu.enable,
			cronRule: config.subscribeMoyu.cronRule,
			apiType: config.subscribeMoyu.apiType
		};
		this.pushLimit = {
			enable: config.pushLimit.enable,
			limitTimes: config.pushLimit.limitTimes,
			limitTime: config.pushLimit.limitTime,
		};
		this.vvhanCdn = config.vvhanCdn;
		this.aliases = config.aliases;
		this.filterContent = config.filterContent;
	}
	
	public async refresh( config ): Promise<string> {
		try {
			this.maxSubscribeNum = config.maxSubscribeNum;
			this.biliDynamicScheduleRule = config.biliDynamicScheduleRule;
			this.biliLiveScheduleRule = config.biliLiveScheduleRule;
			this.biliDynamicApiCacheTime = config.biliDynamicApiCacheTime;
			this.biliLiveApiCacheTime = config.biliLiveApiCacheTime;
			this.biliScreenshotCacheTime = config.biliScreenshotCacheTime;
			this.biliLiveCacheTime = config.biliLiveCacheTime;
			this.liveTemplate = config.liveTemplate;
			this.dynamicTemplate = config.dynamicTemplate;
			this.articleDynamicTemplate = config.articleDynamicTemplate;
			this.videoDynamicTemplate = config.videoDynamicTemplate;
			this.errorMsgTemplate = config.errorMsgTemplate;
			this.screenshotType = config.screenshotType;
			this.subscribeMoyu = {
				enable: config.subscribeMoyu.enable,
				cronRule: config.subscribeMoyu.cronRule,
				apiType: config.subscribeMoyu.apiType
			};
			this.pushLimit = {
				enable: config.pushLimit.enable,
				limitTimes: config.pushLimit.limitTimes,
				limitTime: config.pushLimit.limitTime,
			};
			this.vvhanCdn = config.vvhanCdn;
			this.filterContent = config.filterContent;
			for ( let alias of this.aliases ) {
				delete PluginAlias[alias];
			}
			this.aliases = config.aliases;
			for ( let alias of this.aliases ) {
				PluginAlias[alias] = "hot-news";
			}
			installDep( bot ).then();
			return "hot_news.yml 重新加载完毕";
		} catch ( error ) {
			throw <RefreshCatch>{
				log: ( <Error>error ).stack,
				msg: "hot_news.yml 重新加载失败，请前往控制台查看日志"
			};
		}
	}
}