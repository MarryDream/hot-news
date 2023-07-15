<script lang="ts" setup>
import VideoQRCode from "#/hot-news/components/common/video_qrcode.vue";
import { reactive } from "vue";
import {
	BiliDynamicMajorArchive,
	BiliDynamicModuleAuthor,
	BiliDynamicModuleDynamic,
	Comment,
	Forward,
	Like,
	UpCardInfo
} from "#/hot-news/types/type";
import { toHumanize } from "#/hot-news/util/front-utils";

const props = withDefaults( defineProps<{
	dynamic: BiliDynamicModuleDynamic,
	type: string,
	url: string,
	author: BiliDynamicModuleAuthor & UpCardInfo;
	stat: {
		comment: Comment;
		forward: Forward;
		like: Like;
	};
}>(), {} )

const date = new Date();
const aprilFoolsDay = date.getMonth() + 1 === 4 && date.getDate() === 1;
const major = <BiliDynamicMajorArchive>props.dynamic.major;
const state = reactive( {
	videoInfo: {
		title: major.archive.title,
		cover: major.archive.cover,
		stat: major.archive.stat,
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
</script>

<template>
	<div class="video-box">
		<div class="video-header">
			<div><img alt="logo" src="../../assets/img/ic_logo_default.png"></div>
			<span class="video-header-line">|</span>
			<span class="video-header-text">你感兴趣的视频都在B站</span>
		</div>
		<div class="video-main">
			<div class="video-preview">
				<img :src="state.videoInfo.cover" alt="视频预览图" class="video-preview-img">
				<img alt="视频预览图" class="video-play-icon" src="../../assets/img/ic_publish_video_play.png">
			</div>
			<div class="video-desc-info">
				<h2 style="margin: 0">{{ state.videoInfo.title }}</h2>
				<div class="video-stat">
					<span>{{ state.videoInfo.stat.play }}播放</span>
					<span>·</span>
					<span>{{ state.videoInfo.like }}点赞</span>
					<span>·</span>
					<span>{{ state.videoInfo.stat.danmaku }}弹幕</span>
				</div>
				<div class="video-pub-time">发布于{{ state.videoInfo.pubTime }}</div>
			</div>
		</div>
		<VideoQRCode :url="url">
			<div class="box-main">
				<div class="author-info">
					<div class="avatar-box">
						<img :src="state.avatarImg" alt="avatar" class="avatar-img"/>
						<span v-if="state.isOfficial" class="author-icon bili-avatar-icon-business"></span>
						<span v-else-if="state.isPersonal" class="author-icon bili-avatar-icon-personal"></span>
						<span v-else-if="state.isSmallVip" class="author-icon bili-avatar-icon-small-vip"></span>
						<span v-else-if="state.isBigVip" class="author-icon bili-avatar-icon-big-vip"></span>
					</div>
					<div class="user-info">
						<span class="nickname" style="color: var(--Ga7)">{{ author.name }}</span>
						<span v-if="state.fan_num_str"
						      style="color: var(--Ga5); font-weight: bold">{{ state.fan_num_str }}粉丝</span>
					</div>
				</div>
			</div>
		</VideoQRCode>
	</div>
</template>

<style lang="scss" scoped>

</style>