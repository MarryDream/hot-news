<script lang="ts" setup>

import { toHumanize } from "#/hot-news/util/front-utils";
import { reactive } from "vue";
import { Avatar, Decorate, OfficialVerify, Pendant, Vip } from "#/hot-news/types/type";

const props = defineProps<{
	avatar: Avatar,
	decorate?: Decorate,
	face_nft: boolean,
	following: boolean | null,
	label: string,
	official_verify: OfficialVerify,
	pendant: Pendant,
	pub_location_text: string,
	vip: Vip,
	mid: number,
	face: string,
	name: string,
	jump_url: string,
	pub_action: string,
	pub_time: string,
	pub_ts: number,
	type: string
}>();

const date = new Date();
const aprilFoolsDay = date.getMonth() + 1 === 4 && date.getDate() === 1;

const state = reactive( {
	avatarImg: `${ props.face }@96w_96h_1c_1s.webp`,
	avatarPendant: `${ props.pendant.image_enhance }@144w_144h.webp`,
	pubTime: toHumanize( props.pub_ts ),
	isOfficial: props.official_verify.type === 1,
	isPersonal: props.official_verify.type === 0,
	isBigVip: props.vip.status === 1,
	isSmallVip: props.vip.status === 1 && aprilFoolsDay,
	decorateClass: props.decorate?.type === 1 ? "decorate-dom-type1" : "decorate-dom-type3"
} );
</script>

<template>
	<div class="box-main">
		<div class="author-info">
			<div class="avatar-box">
				<img :src="state.avatarImg" alt="avatar" class="avatar-img"/>
				<div v-if="pendant.image_enhance" class="avatar-pendant-dom">
					<img :src="state.avatarPendant" alt="pendant" class="avatar-pendant"/>
				</div>
				<span v-if="state.isOfficial" class="author-icon bili-avatar-icon-business"></span>
				<span v-else-if="state.isPersonal" class="author-icon bili-avatar-icon-personal"></span>
				<span v-else-if="state.isSmallVip" class="author-icon bili-avatar-icon-small-vip"></span>
				<span v-else-if="state.isBigVip" class="author-icon bili-avatar-icon-big-vip"></span>
			</div>
			<div class="user-info">
				<span :style="{color: vip.nickname_color}" class="nickname">{{ name }}</span>
				<span class="publish_time">{{ state.pubTime }}</span>
				<slot/>
			</div>
		</div>
		<div v-if="decorate" :class="state.decorateClass">
			<img :src="decorate.card_url" alt="decorate" class="decorate-img"/>
			<span v-if="decorate.type===3" :style="{color: decorate.fan.color}">{{ decorate.fan.num_str }}</span>
		</div>
	</div>
</template>

<style lang="scss" scoped>

</style>