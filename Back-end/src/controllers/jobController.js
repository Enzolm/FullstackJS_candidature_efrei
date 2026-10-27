const RSS_URL =
	"https://weworkremotely.com/categories/remote-full-stack-programming-jobs.rss";

const decodeXml = (value) =>
	value
		.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
		.replace(/&amp;/g, "&")
		.replace(/&lt;/g, "<")
		.replace(/&gt;/g, ">")
		.replace(/&quot;/g, '"')
		.replace(/&#39;/g, "'");

const getTagValue = (item, tag) => {
	const match = item.match(
		new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, "i"),
	);
	return match ? decodeXml(match[1].trim()) : "";
};

export const getRemoteJobs = async (req, res) => {
	try {
		const response = await fetch(RSS_URL, {
			headers: { "User-Agent": "TrackMyApply/1.0" },
		});

		if (!response.ok) {
			return res.status(502).json({
				success: false,
				message: "Le flux des offres est indisponible.",
			});
		}

		const xml = await response.text();
		const items = [...xml.matchAll(/<item(?:\s[^>]*)?>([\s\S]*?)<\/item>/gi)].map(
			([, item], index) => ({
				id:
					getTagValue(item, "guid") ||
					getTagValue(item, "link") ||
					String(index),
				title: getTagValue(item, "title"),
				link: getTagValue(item, "link"),
				description: getTagValue(item, "description"),
				publishedAt: getTagValue(item, "pubDate"),
				category: getTagValue(item, "category"),
			}),
		);

		return res.status(200).json({ success: true, data: items });
	} catch (error) {
		return res.status(502).json({
			success: false,
			message: "Impossible de récupérer les offres d'emploi.",
			error: error.message,
		});
	}
};
