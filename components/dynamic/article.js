const template = `
<div class="article-main">
	<div class="article-top">
		<img :src="cover" alt="头部背景图" v-if="cover" class="article-top-bg-img">
		<div>
			<div class="side-label"><span></span></div>
			<div class="title-box">
				<h1 style="color: rgba(0,0,0,.7);margin: 0;">{{title}}</h1>
			</div>
			<Header v-bind="author">
				<div>
				<span class="up_data" v-if="fan_num_str">粉丝：{{fan_num_str}}&nbsp;</span>
				<span class="up_data" v-if="author.article_count">文章：{{author.article_count}}</span>
				</div>
			</Header>
		</div>
	</div>
	
	<div class="article-content" v-html="contentHtml"></div>
</div>
<QRCode :url="url"></QRCode>
`;

import QRCode from "../common/qrcode.js";
import Header from "./header.js";

const { defineComponent, toRefs, reactive } = Vue;

export default defineComponent( {
	name: "Article",
	template,
	components: {
		Header,
		QRCode
	},
	props: {
		url: String,
		author: Object,
		dynamic: Object,
		type: String,
		articleHtml: String
	},
	setup( props ) {
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
			state.contentHtml = selector.innerHTML.replaceAll( "data-src", "src" );
		} else {
			const contentHtml = element.querySelectorAll( ".opus-module-content" );
			state.contentHtml = contentHtml && contentHtml.length > 0 ? contentHtml[0].innerHTML.replaceAll( "data-src", "src" ) : "";
		}
		
		if ( props.dynamic.major.type === 'MAJOR_TYPE_ARTICLE' ) {
			const covers = props.dynamic.major.article.covers;
			const cover = covers && covers.length > 0 ? covers[0] : "";
			state.cover = `${ cover }@2072w.webp`;
			state.title = props.dynamic.major.article.title;
		} else {
			state.title = props.dynamic.major.opus.title;
		}
		
		if ( props.author.follower ) {
			const fan_num = props.author.follower;
			if ( fan_num > 10000 ) {
				const number = Math.round( parseFloat( `${ fan_num / 10000 }` ) * 10 ) / 10;
				state.fan_num_str = `${ number }万`;
			} else {
				state.fan_num_str = `${ fan_num }`
			}
		}
		
		return {
			...toRefs( state )
		}
	}
} );