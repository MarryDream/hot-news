<script lang="ts" setup>
import { ref } from "vue";

const props = withDefaults( defineProps<{
	avatar: string,
	name: string,
	nicknameColor: string
}>(), {
	avatar: "",
	name: "",
	nicknameColor: ""
} )
const avatarImg = ref( `${ props.avatar }@48w_48h_1c.webp` );
</script>

<template>
	<div class="bili-dyn-content__orig__author">
		<div class="dyn-orig-author">
			<div class="dyn-orig-author__left">
				<div class="dyn-orig-author__face">
					<img :src="avatarImg" alt="avatar" class="dyn-orig-author__face__img bili-awesome-img"/>
				</div>
				<span :style="{color: nicknameColor}" class="dyn-orig-author__name fs-medium">{{ name }}</span>
			</div>
		</div>
	</div>
</template>

<style lang="scss" scoped>

</style>