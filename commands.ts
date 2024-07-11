import { ConfigType, EnquireConfig, OrderConfig } from "@/modules/command";
import { MessageScope } from "@/modules/message";
import { AuthLevel } from "@/modules/management/auth";

const subscribe_news: OrderConfig = {
	type: "order",
	cmdKey: "hot-news.subscribe_news",
	desc: [ "订阅消息", "(订阅源)" ],
	headers: [ "subscribe_news" ],
	regexps: [ ".*" ],
	scope: MessageScope.Both,
	auth: AuthLevel.User,
	main: "achieves/subscribe_news",
	detail: "订阅每日热点新闻、B站动态、摸鱼日报，可用的订阅源包括：\n" +
		"- 新闻源：新浪、知乎、网易、头条、百度、60秒新闻。默认使用头条，仅可使用一个新闻源覆盖订阅(每天8:30~9点推送)。\n" +
		"- B站源：用UP名称或UID，来订阅该UP的动态和直播。\n" +
		"- 摸鱼日报源：摸鱼。"
};

const unsubscribe_news: OrderConfig = {
	type: "order",
	cmdKey: "hot-news.unsubscribe_news",
	desc: [ "取消订阅消息", "[订阅源]" ],
	headers: [ "unsubscribe_news" ],
	regexps: [ ".+" ],
	scope: MessageScope.Both,
	auth: AuthLevel.User,
	main: "achieves/unsubscribe_news",
	detail: "取消订阅的消息。可用订阅源：\n" +
		"- 新闻源: 新浪、知乎、网易、头条、百度、60秒新闻\n" +
		"- B站源: UP名称或UID\n" +
		"- 摸鱼日报: 摸鱼"
};

const limit_genshin_dynamic_notify: OrderConfig = {
	type: "order",
	cmdKey: "hot-news.limit_genshin_dynamic_notify",
	desc: [ "设置动态推送保留时间", "[小时]" ],
	headers: [ "lgdn" ],
	regexps: [ "\\d+" ],
	scope: MessageScope.Both,
	auth: AuthLevel.User,
	main: "achieves/limit",
	detail: "设置推送动态信息的保留时间，如果这条动态已经过去了某某小时则视为用户已自行得知该消息，放弃推送该消息"
};

const my_subscribe_list: OrderConfig = {
	type: "order",
	cmdKey: "hot-news.my_subscribe_list",
	desc: [ "我的新闻订阅列表", "" ],
	headers: [ "mysl" ],
	regexps: [ "" ],
	scope: MessageScope.Both,
	auth: AuthLevel.User,
	main: "achieves/subscribe_list",
	detail: "查看我订阅的新闻和UP主"
};

const remove_subscribe: OrderConfig = {
	type: "order",
	cmdKey: "hot-news.remove_subscribe",
	desc: [ "移除某群订阅的消息", "[群号]" ],
	headers: [ "rms" ],
	regexps: [ "\\d+" ],
	scope: MessageScope.Private,
	auth: AuthLevel.Manager,
	main: "achieves/remove_subscribe",
	detail: "该指令用户移除某个群的所有新闻和B站订阅"
};

const set_at_all: OrderConfig = {
	type: "order",
	cmdKey: "hot-news.set_at_all",
	desc: [ "设置允许@全体的UP", "[UID]" ],
	headers: [ "sat" ],
	regexps: [ "\\d+" ],
	scope: MessageScope.Group,
	auth: AuthLevel.User,
	main: "achieves/set_at_all",
	detail: "该指令用于设置允许在直播推送时@全体的UP"
};

const unset_at_all: OrderConfig = {
	type: "order",
	cmdKey: "hot-news.unset_at_all",
	desc: [ "移除允许@全体的UP", "[UID]" ],
	headers: [ "unsat" ],
	regexps: [ "\\d+" ],
	scope: MessageScope.Group,
	auth: AuthLevel.User,
	main: "achieves/unset_at_all",
	detail: "该指令用于移除允许在直播推送时@全体的UP。"
};

const sms: EnquireConfig = {
	type: "enquire",
	cmdKey: "hot-news.sms-webhook",
	desc: [ "申请接收短信服务", "" ],
	headers: [ "订阅短信" ],
	scope: MessageScope.Private,
	auth: AuthLevel.User,
	timeout: 60,
	main: "achieves/sms/apply",
	detail: "该指令用于申请一个可以接收短信的Webhook地址，并将后续的短信推送给用户。本服务通过 SmsForwarder App 实现，请访问该在线文档 https://gitee.com/pp/SmsForwarder/wikis/pages " +
		"了解该 App 后再考虑是否使用本服务。"
};

const remove_sms: OrderConfig = {
	type: "order",
	cmdKey: "hot-news.remove_sms_webhook",
	desc: [ "移除短信服务", "" ],
	headers: [ "取消订阅短信" ],
	regexps: [ "" ],
	scope: MessageScope.Private,
	auth: AuthLevel.User,
	main: "achieves/sms/remove_sms",
	detail: "该指令用于移除之前申请的短信服务。"
}

export default <ConfigType[]>[
	subscribe_news,
	unsubscribe_news,
	my_subscribe_list,
	remove_subscribe,
	limit_genshin_dynamic_notify,
	set_at_all,
	unset_at_all,
	sms,
	remove_sms,
]