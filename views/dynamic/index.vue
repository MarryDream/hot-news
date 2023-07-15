<script lang="ts" setup>
import { onMounted, ref } from "vue";
import { urlParamsGet } from "@/utils/url";
import $http from "#/hot-news/util/http";
import {
	BiliDynamicCard,
	BiliDynamicForwardCard,
	BiliDynamicMajorArchive,
	BiliDynamicModuleAuthor,
	BiliDynamicModuleDynamic,
	Comment,
	Forward,
	Like,
	UpCardInfo
} from "#/hot-news/types/type";
import Dynamic from "#/hot-news/components/dynamic/dynamic.vue";
import Face from "#/hot-news/components/dynamic/face.vue";
import QRCode from "#/hot-news/components/common/qrcode.vue";
import DynamicHeader from "#/hot-news/components/dynamic/header.vue";
import Article from "./article.vue";
import Video from "./video.vue";

type ArticleInfo = {
	jump_url: string;
	articleHtml: string;
}

const author = ref<BiliDynamicModuleAuthor & UpCardInfo | null>( null );
const dynamic = ref<BiliDynamicModuleDynamic | null>( null );
const face = ref<{
	avatar: string,
	name: string,
	nicknameColor: string
}>();
const orig = ref<BiliDynamicCard | null>( null );
const type = ref<string>( "" );
const url = ref<string>( "https://m.bilibili.com/dynamic/" );
const stat = ref<{
	comment: Comment;
	forward: Forward;
	like: Like;
} | null>( null );
const articleHtml = ref<string>( "" );

const urlParams = urlParamsGet( location.href );
const data = ref<BiliDynamicCard & UpCardInfo & ArticleInfo | null>( null );

const getData = async () => {
	data.value = await $http.Dynamic.get( { dynamicId: urlParams.dynamicId } )
	if ( !data.value ) return;

	if ( data.value?.type === 'DYNAMIC_TYPE_ARTICLE' ) {
		url.value = `https:${ data.value?.jump_url }`;
		articleHtml.value = data.value?.articleHtml || "";
	} else if ( data.value?.type === 'DYNAMIC_TYPE_AV' ) {
		url.value = `https:${ ( <BiliDynamicMajorArchive>data.value?.modules.module_dynamic.major ).archive.jump_url }`;
	} else {
		url.value = `${ url.value }${ data.value?.id_str }`;
	}
	author.value = {
		...data.value!.modules.module_author,
		follower: data.value!.follower,
		article_count: data.value!.article_count,
		vip_status: data.value!.vip_status
	};
	dynamic.value = data.value!.modules.module_dynamic;
	type.value = data.value!.type;
	stat.value = data.value?.modules.module_stat || null;
	if ( data.value!.type === "DYNAMIC_TYPE_FORWARD" ) {
		const forward = <BiliDynamicForwardCard>data.value;
		face.value = {
			avatar: forward.orig.modules.module_author.face,
			name: forward.orig.modules.module_author.name,
			nicknameColor: forward.orig.modules.module_author.vip.nickname_color
		}
		orig.value = forward.orig;
	}
}

onMounted( () => {
	getData();
} )

</script>

<template>
	<div id="app">
		<template v-if="type === 'DYNAMIC_TYPE_ARTICLE' && author && dynamic">
			<Article :articleHtml="articleHtml" :author="author" :dynamic="dynamic" :type="type" :url="url"></Article>
		</template>
		<template v-else-if="type === 'DYNAMIC_TYPE_AV' && dynamic && author && stat">
			<Video :author="author" :dynamic="dynamic" :stat="stat" :type="type" :url="url"></Video>
		</template>
		<template v-else>
			<div style="margin: 20px; border-radius: 10px; border: 1px solid transparent;">
				<DynamicHeader v-if="author" v-bind="author"/>
				<Dynamic v-if="dynamic" :dynamic="dynamic" :type="type">
					<div v-if="type === 'DYNAMIC_TYPE_FORWARD'" class="bili-dyn-content__orig reference">
						<Face v-if="face" v-bind="face"/>
						<Dynamic v-if="orig" :dynamic="orig.modules.module_dynamic" :type="orig.type"/>
					</div>
				</Dynamic>
				<QRCode :url="url"/>
			</div>
		</template>
	</div>
</template>


<style src="../../assets/styles/root.css"/>
<style src="../../assets/styles/qrcode.css"/>
<style src="../../assets/styles/avatar.css"/>
<style src="../../assets/styles/dynamic.css"/>
<style src="../../assets/styles/face.css"/>
<style src="../../assets/styles/article.css"/>
<style src="../../assets/styles/video.css"/>

<style lang="scss">
#app {
	width: 600px;
}

@font-face {
	font-family: 'fanscard';
	src: url('//s1.hdslb.com/bfs/static/jinkela/mall-h5/asserts/fansCard.ttf');
}

@font-face {
	font-family: "HN-Font";
	src: url("../../assets/fonts/HN-Font.woff2") format("woff2"),
	url("../../assets/fonts/HN-Font.woff") format("woff"),
	url("../../assets/fonts/HN-Font.ttf"),
	url("../../assets/fonts/HN-Font.ttc");
}

body, html {
	font-family: HN-Font, Noto Sans SC, PingFang SC, HarmonyOS_Regular, Helvetica Neue, Helvetica, Arial, Microsoft Yahei, Hiragino Sans GB, Heiti SC, WenQuanYi Micro Hei, sans-serif;
	background-color: #fff;
}

div {
	box-sizing: border-box;
}

svg {
	fill: currentColor;
	height: 1em;
	width: 1em;
}

svg:not(:root) {
	overflow-clip-margin: content-box;
	overflow: hidden;
}

img {
	overflow-clip-margin: content-box;
	overflow: clip;
}
</style>