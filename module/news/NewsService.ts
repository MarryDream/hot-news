import { Sendable } from "@/modules/lib";

export interface NewsService {
	
	/**
	 * 获取订阅的消息
	 */
	getInfo( channel?: string ): Promise<Sendable>;
	
	/**
	 * 处理订阅服务
	 */
	handler(): Promise<void>;
}