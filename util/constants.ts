export const DB_KEY = {
	// 订阅的新闻渠道
	channel: "hot_news.subscribe_channel",
	// bilibili直播推送状态
	bili_live_notified: 'hot_news.bili_live_notified',
	// 已发布的bilibili动态ID集合
	bili_dynamic_ids_key: 'hot_news.bili_dynamic_ids',
	// bilibili动态内容
	bili_dynamic_key: 'hot_news.bili_dynamic',
	// bilibili某UP的直播间信息
	bili_live_info_key: 'hot_news.bili_live_info',
	bili_live_status_key: 'hot_news.bili_live_status',
	// 限制bilibili动态过时的时间
	limit_bili_dynamic_time_key: "hot_news.limit_bili_dynamic_time",
	// 用户订阅的bilibili up主uid
	notify_bili_ids_key: 'hot_news.notify_bili_ids',
	// 摸鱼日报图的URL缓存
	moyu_img_url_key: 'hot_news.moyu_img_url',
	'60s_img_url_key': 'hot_news.60s_img_url',
	bili_dynamic_info_key: 'hot_news.bili_dynamic_info',
	// 允许推送时@全体的UP
	notify_at_all_up_key: "hot_news.notify_at_all_up.",
	// 订阅消息的QQ号类型，0为群，1为私聊
	subscribe_chat_info_key: "hot_news.subscribe_chat_info",
	// 某直播间已推送的 QQ 集合
	bili_live_notified_list_key: 'hot_news.bili_live_notified_list.',
}

export const CHANNEL_NAME = {
	toutiao: '头条',
	sina: '新浪',
	wangyi: '网易',
	zhihu: '知乎',
	baidu: '百度',
	moyu: '摸鱼',
	"60sNews": '60秒新闻',
}

/**
 * 初始化一些 bilibili 用户的映射
 */
export const bili_user_map = {
	133934: "崩坏学园2-灵依娘desu",
	27534330: "崩坏3第一偶像爱酱",
	436175352: "未定事件簿",
	401742377: "原神",
	1340190821: "崩坏星穹铁道",
	1636034895: "绝区零",
	488836173: "yoyo鹿鸣_Lumi",
	2920960: "大祥哥来了",
	1871001: "棉花大哥哥",
	27717502: "时雨ioo",
	80304: "亚食人",
	653768: "赫萝的苹果",
	7145647: "月爱",
	8199: "紫苏九月",
	431073645: "你的影月月",
	1773346: "莴苣某人",
	287551041: "一万根韭菜",
	512839: "卢诺米阿玛斯宾",
	551188239: "企鹅带带北极熊",
	1282271864: "自由魂儿儿儿",
	23730666: "老沐ocean",
	3127528: "空耳狂魔",
	2013376075: "HoYoFair",
	642389251: "黑神话悟空",
	14048220: "马刀刻森",
}