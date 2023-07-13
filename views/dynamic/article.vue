<script lang="ts" setup>
import { reactive } from "vue";
import {
	BiliDynamicMajorArticle,
	BiliDynamicMajorOpus,
	BiliDynamicModuleAuthor,
	BiliDynamicModuleDynamic,
	UpCardInfo
} from "#/hot-news/types/type";
// import QRCode from "#/hot-news/components/common/qrcode.vue";
import QRCode from "../../components/common/qrcode.vue";

const props = withDefaults( defineProps<{
	url: string;
	author: BiliDynamicModuleAuthor & UpCardInfo;
	dynamic: BiliDynamicModuleDynamic;
	type: string;
	articleHtml: string;
}>(), {} )

const state = reactive( {
	fan_num_str: "",
	cover: "",
	title: "",
	contentHtml: ""
} );
const element = document.createElement( "div" );
element.hidden;
element.innerHTML = props.articleHtml;
const selector = element.querySelector( "#article-content" );
if ( selector ) {
	state.contentHtml = selector.innerHTML.replace( /data-src/g, "src" );
} else {
	const contentHtml = element.querySelectorAll( ".opus-module-content" );
	state.contentHtml = contentHtml && contentHtml.length > 0 ? contentHtml[0].innerHTML.replace( /data-src/g, "src" ) : "";
}

if ( props.dynamic.major!.type === 'MAJOR_TYPE_ARTICLE' ) {
	const major = <BiliDynamicMajorArticle>props.dynamic.major;
	const covers: string[] = major.article.covers;
	const cover: string = covers && covers.length > 0 ? covers[0] : "";
	state.cover = `${ cover }@2072w.webp`;
	state.title = major.article.title;
} else {
	const major = <BiliDynamicMajorOpus>props.dynamic.major;
	state.title = major.opus.title;
}

if ( props.author.follower ) {
	const fan_num: number = props.author.follower;
	if ( fan_num > 10000 ) {
		const number = Math.round( parseFloat( `${ fan_num / 10000 }` ) * 10 ) / 10;
		state.fan_num_str = `${ number }万`;
	} else {
		state.fan_num_str = `${ fan_num }`
	}
}
</script>

<template>
	<div class="article-main">
		<div class="article-top">
			<img v-if="state.cover" :src="state.cover" alt="头部背景图" class="article-top-bg-img">
			<div>
				<div class="side-label"><span></span></div>
				<div class="title-box">
					<h1 style="color: rgba(0,0,0,.7);margin: 0;">{{ state.title }}</h1>
				</div>
				<Header v-bind="author">
					<div>
						<span v-if="state.fan_num_str" class="up_data">粉丝：{{ state.fan_num_str }}&nbsp;</span>
						<span v-if="author.article_count" class="up_data">文章：{{ author.article_count }}</span>
					</div>
				</Header>
			</div>
		</div>
		<div class="article-content" v-html="state.contentHtml"></div>
	</div>
	<QRCode :url="url"></QRCode>
</template>

<style lang="scss" scoped>

</style>