const template = `
<div class="video-box">
	<div class="video-header">
		<div><img src="/hot-news/assets/img/ic_logo_default.png" alt="logo"></div>
		<span class="video-header-line">|</span>
		<span class="video-header-text">你感兴趣的视频都在B站</span>
	</div>
	<div class="video-main">
		<div class="video-preview">
			<img :src="videoInfo.cover" alt="视频预览图" class="video-preview-img">
			<img src="/hot-news/assets/img/ic_publish_video_play.png" alt="视频预览图" class="video-play-icon">
		</div>
		<div class="video-desc-info">
			<h2 style="margin: 0">{{videoInfo.title}}</h2>
			<div class="video-stat">
				<span>{{videoInfo.stat.play}}播放</span>
				<span>·</span>
				<span>{{videoInfo.like}}点赞</span>
				<span>·</span>
				<span>{{videoInfo.stat.danmaku}}弹幕</span>
			</div>
			<div class="video-pub-time">发布于{{videoInfo.pubTime}}</div>
		</div>
	</div>
	<VideoQRCode :url="url">
		<div class="box-main">
			<div class="author-info">
				<div class="avatar-box">
					<img class="avatar-img" :src="avatarImg" alt="avatar"/>
					<span class="author-icon bili-avatar-icon-business" v-if="isOfficial"></span>
					<span class="author-icon bili-avatar-icon-personal" v-else-if="isPersonal"></span>
					<span class="author-icon bili-avatar-icon-small-vip" v-else-if="isSmallVip"></span>
					<span class="author-icon bili-avatar-icon-big-vip" v-else-if="isBigVip"></span>
				</div>
				<div class="user-info">
					<span class="nickname" style="color: var(--Ga7)">{{author.name}}</span>
					<span style="color: var(--Ga5); font-weight: bold" v-if="fan_num_str">{{fan_num_str}}粉丝</span>
				</div>
			</div>
		</div>
	</VideoQRCode>
</div>`;

import { toHumanize } from "../../../assets/js/utils.js";
import VideoQRCode from "../../../components/video_qrcode.js";
import Face from "./face.js";

const { defineComponent, reactive, toRefs } = Vue;

export default defineComponent( {
	name: "Video",
	template,
	props: {
		dynamic: Object,
		type: String,
		url: String,
		author: Object,
		stat: Object
	},
	components: {
		VideoQRCode,
		Face
	},
	setup( props ) {
		const date = new Date();
		const aprilFoolsDay = date.getMonth() + 1 === 4 && date.getDate() === 1;
		const state = reactive( {
			videoInfo: {
				title: props.dynamic.major.archive.title,
				cover: props.dynamic.major.archive.cover,
				stat: props.dynamic.major.archive.stat,
				pubTime: toHumanize( props.author.pub_ts, 2 ),
				like: ""
			},
			fan_num_str: "",
			avatarImg: `${ props.author.face }@96w_96h_1c_1s.webp`,
			isOfficial: props.author.official_verify.type === 1,
			isPersonal: props.author.official_verify.type === 0,
			isBigVip: props.author.vip.status === 1,
			isSmallVip: props.author.vip.status === 1 && aprilFoolsDay
		} );
		
		const like = props.stat.like.count;
		if ( like > 10000 ) {
			const number = Math.round( parseFloat( `${ like / 10000 }` ) * 10 ) / 10;
			state.videoInfo.like = `${ number }万`;
		} else {
			state.videoInfo.like = `${ like }`
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