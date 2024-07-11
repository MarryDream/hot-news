import Dynamic from "#/hot-news/routes/dynamic";
import Sixty from "#/hot-news/routes/sixty";
import Live from "#/hot-news/routes/live";
import Webhook from "#/hot-news/routes/webhook";

export default {
	"/api/dynamic": Dynamic,
	"/api/sixty": Sixty,
	"/api/live": Live,
	"/api/webhook": Webhook
}