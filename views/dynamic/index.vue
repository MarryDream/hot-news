<script lang="ts" setup>
import { onMounted, reactive, ref } from "vue";
import { urlParamsGet } from "@/utils/url";
import $http from "#/hot-news/util/http";
import { BiliDynamicCard, BiliDynamicForwardCard, BiliDynamicMajorArchive, UpCardInfo } from "#/hot-news/types/type";
// import Dynamic from "#/hot-news/components/dynamic/dynamic.vue";
import Dynamic from "../../components/dynamic/dynamic.vue";
// import Article from "#/hot-news/views/dynamic/article.vue";
import Article from "./article.vue";
// import Face from "#/hot-news/components/dynamic/face.vue";
import Face from "../../components/dynamic/face.vue";
// import QRCode from "#/hot-news/components/common/qrcode.vue";
import QRCode from "../../components/common/qrcode.vue";
// import Video from "#/hot-news/views/dynamic/video.vue";
import Video from "./video.vue";

type ArticleInfo = {
	jump_url: string;
	articleHtml: string;
}

const state = reactive( {
	url: "https://m.bilibili.com/dynamic/",
	author: {},
	dynamic: {},
	orig: {},
	type: "",
	face: {
		avatar: "",
		name: "",
		nicknameColor: ""
	},
	articleHtml: "",
	stat: {}
} );

const urlParams = urlParamsGet( location.href );
const data = ref<BiliDynamicCard & UpCardInfo & ArticleInfo | null>( null );

const getData = async () => {
	const res = await $http.Dynamic.get( { dynamicId: urlParams.dynamicId } );
	data.value = {
		...res
	}
}

onMounted( () => {
	getData();
} )


if ( data.value?.type === 'DYNAMIC_TYPE_ARTICLE' ) {
	state.url = `https:${ data.value?.jump_url }`;
} else if ( data.value?.type === 'DYNAMIC_TYPE_AV' ) {
	state.url = `https:${ ( <BiliDynamicMajorArchive>data.value?.modules.module_dynamic.major ).archive.jump_url }`;
} else {
	state.url = `${ state.url }${ data.value?.id_str }`;
}
state.author = {
	...data.value?.modules.module_author,
	follower: data.value?.follower,
	article_count: data.value?.article_count
};
state.dynamic = data.value?.modules.module_dynamic;
state.type = data.value!.type;
state.stat = data.value?.modules.module_stat;
if ( data.value!.type === "DYNAMIC_TYPE_FORWARD" ) {
	const forward = <BiliDynamicForwardCard>data.value;
	state.face.avatar = forward.orig.modules.module_author.face;
	state.face.name = forward.orig.modules.module_author.name;
	state.face.nicknameColor = forward.orig.modules.module_author.vip.nickname_color;
	state.orig = forward.orig;
}

</script>

<template>
	<template v-if="state.type === 'DYNAMIC_TYPE_ARTICLE'">
		<Article :articleHtml="state.articleHtml" :author="state.author" :dynamic="state.dynamic" :type="state.type"
		         :url="state.url"></Article>
	</template>
	<template v-else-if="state.type === 'DYNAMIC_TYPE_AV'">
		<Video :author="state.author" :dynamic="state.dynamic" :stat="state.stat" :type="state.type"
		       :url="state.url"></Video>
	</template>
	<template v-else>
		<div style="margin: 20px; border-radius: 10px; border: 1px solid transparent;">
			<Header v-bind="state.author"/>
			<Dynamic :dynamic="state.dynamic" :type="state.type">
				<div v-if="state.type === 'DYNAMIC_TYPE_FORWARD'" class="bili-dyn-content__orig reference">
					<Face v-bind="state.face"/>
					<Dynamic :dynamic="state.orig.modules.module_dynamic" :type="state.orig.type"/>
				</div>
			</Dynamic>
			<QRCode :url="state.url"/>
		</div>
	</template>
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