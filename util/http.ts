import { FetchServer, register } from "@/utils/request";

const apis = {
	Dynamic: "/dynamic",
	Live: "/live"
}

const { request, server } = register( {
	baseURL: "/api",
	responseType: "json",
	timeout: 30000
}, apis );

// 设置响应拦截
server.interceptors.response.use( resp => {
	return Promise.resolve( resp.data );
} );

export default <FetchServer<keyof typeof apis, any>><unknown>request;