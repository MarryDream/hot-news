const template = `
<template v-if="type === 'DYNAMIC_TYPE_ARTICLE'">
	<Article :dynamic="dynamic" :type="type" :author="author" :url="url" :articleHtml="articleHtml"></Article>
</template>
<template v-else-if="type === 'DYNAMIC_TYPE_AV'">
	<Video :dynamic="dynamic" :type="type" :author="author" :url="url" :stat="stat"></Video>
</template>
<template v-else>
	<div style="margin: 20px; border-radius: 10px; border: 1px solid transparent;">
		<Header v-bind="author"/>
		<Dynamic :dynamic="dynamic" :type="type">
			<div v-if="type === 'DYNAMIC_TYPE_FORWARD'" class="bili-dyn-content__orig reference">
				<Face v-bind="face"/>
				<Dynamic :dynamic="orig.modules.module_dynamic" :type="orig.type"/>
			</div>
		</Dynamic>
		<QRCode :url="url"/>
	</div>
</template>
`;

import { parseURL, request } from "../../public/js/utils.js";
import Header from "./header.js";
import QRCode from "../common/qrcode.js"
import Dynamic from "./dynamic.js";
import Face from "./face.js";
import Article from "./article.js";
import Video from "./video.js";

const { defineComponent, toRefs, reactive } = Vue;

export default defineComponent( {
	name: "App",
	template,
	components: {
		QRCode,
		Header,
		Dynamic,
		Face,
		Article,
		Video
	},
	setup() {
		const state = reactive( {
			url: "https://m.bilibili.com/dynamic/",
			author: {},
			dynamic: {},
			orig: null,
			type: "",
			face: {
				avatar: "",
				name: "",
				nicknameColor: ""
			},
			articleHtml: "",
			stat: {}
		} );
		const urlParams = parseURL( location.search );
		const data = request( `/api/dynamic?dynamicId=${ urlParams.dynamicId }` );
		state.articleHtml = data.articleHtml;
		if ( data.type === 'DYNAMIC_TYPE_ARTICLE' ) {
			state.url = `https:${ data.jump_url }`;
		} else if ( data.type === 'DYNAMIC_TYPE_AV' ) {
			state.url = `https:${ data.modules.module_dynamic.major.archive.jump_url }`;
		} else {
			state.url = `${ state.url }${ data.id_str }`;
		}
		state.author = {
			...data.modules.module_author,
			follower: data.follower,
			article_count: data.article_count
		};
		state.dynamic = data.modules.module_dynamic;
		state.type = data.type;
		state.orig = data.orig;
		state.stat = data.modules.module_stat;
		if ( data.type === "DYNAMIC_TYPE_FORWARD" ) {
			state.face.avatar = data.orig.modules.module_author.face;
			state.face.name = data.orig.modules.module_author.name;
			state.face.nicknameColor = data.orig.modules.module_author.vip.nickname_color;
		}
		return { ...toRefs( state ) }
	}
} );
