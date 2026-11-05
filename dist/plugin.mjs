//#region src/sdk/generic-plugin.ts
function createGenericDescription(input, reasonCode = "plugin.generic") {
	const upstreamName = input.upstreamAlias.length === 0 ? input.upstreamAlias : `${input.upstreamAlias[0]?.toUpperCase()}${input.upstreamAlias.slice(1)}`;
	return {
		source: "generic",
		reasonCode,
		normalizedContext: input.arguments !== null && typeof input.arguments === "object" && !Array.isArray(input.arguments) ? structuredClone(input.arguments) : { arguments: structuredClone(input.arguments) },
		sensitivePaths: [],
		title: {
			key: "plugin.generic.title",
			params: {
				upstream: input.upstreamAlias,
				tool: input.toolName
			},
			fallback: {
				en: `${upstreamName}: ${input.toolName}`,
				cs: `${upstreamName}: ${input.toolName}`
			}
		},
		sections: [{
			id: "arguments",
			heading: {
				key: "plugin.generic.arguments",
				fallback: {
					en: "Arguments",
					cs: "Argumenty"
				}
			},
			fields: [{
				label: {
					key: "plugin.generic.raw_arguments",
					fallback: {
						en: "Tool arguments",
						cs: "Argumenty nástroje"
					}
				},
				value: structuredClone(input.arguments)
			}]
		}],
		proposedScopes: []
	};
}
//#endregion
//#region src/plugin.ts
function tool(en, cs, risk, fields = [], scopeKey) {
	return {
		en,
		cs,
		risk,
		fields,
		...scopeKey === void 0 ? {} : { scopeKey }
	};
}
/** Tool names and argument keys were verified against the connected MCP catalog. */
const CONNECTED_TOOL_DEFINITIONS = { imcp: {
	calendars_list: tool("List calendars", "Vypsat kalendáře", "info"),
	contacts_create: tool("Create contact", "Vytvořit kontakt", "warning", [
		"givenName",
		"familyName",
		"organizationName",
		"emailAddresses",
		"phoneNumbers"
	]),
	contacts_list: tool("List contacts", "Vypsat kontakty", "info", ["limit"]),
	contacts_me: tool("Read my contact", "Načíst můj kontakt", "info"),
	contacts_search: tool("Search contacts", "Hledat kontakty", "info", [
		"name",
		"email",
		"phone"
	]),
	contacts_update: tool("Update contact", "Upravit kontakt", "warning", [
		"identifier",
		"givenName",
		"familyName",
		"organizationName",
		"emailAddresses",
		"phoneNumbers"
	]),
	events_create: tool("Create calendar event", "Vytvořit událost v kalendáři", "warning", [
		"title",
		"start",
		"end",
		"calendar",
		"location",
		"isRecurring"
	]),
	events_delete: tool("Delete calendar event", "Smazat událost z kalendáře", "danger", [
		"identifier",
		"start",
		"span"
	]),
	events_fetch: tool("Read calendar events", "Načíst události kalendáře", "info", [
		"calendars",
		"query",
		"start",
		"end"
	]),
	location_current: tool("Read current location", "Zjistit aktuální polohu", "warning"),
	location_geocode: tool("Geocode address", "Vyhledat souřadnice adresy", "info", ["address"]),
	"location_reverse-geocode": tool("Find address by coordinates", "Zjistit adresu podle souřadnic", "info", ["latitude", "longitude"]),
	maps_directions: tool("Plan route", "Naplánovat trasu", "info", [
		"originAddress",
		"destinationAddress",
		"originCoordinates",
		"destinationCoordinates",
		"transportType"
	]),
	maps_eta: tool("Calculate travel time", "Spočítat dobu cesty", "info", [
		"originLatitude",
		"originLongitude",
		"destinationLatitude",
		"destinationLongitude",
		"transportType"
	]),
	maps_explore: tool("Find nearby places", "Najít místa v okolí", "info", [
		"category",
		"latitude",
		"longitude",
		"radius"
	]),
	maps_generate: tool("Generate map image", "Vytvořit obrázek mapy", "info", [
		"latitude",
		"longitude",
		"mapType"
	]),
	maps_search: tool("Search places", "Hledat místa", "info", ["query"]),
	messages_fetch: tool("Read messages", "Načíst zprávy", "info", [
		"participants",
		"query",
		"start",
		"end"
	]),
	phone_call: tool("Start phone call", "Zahájit telefonní hovor", "warning", ["phoneNumber"]),
	phone_calls_fetch: tool("Read call history", "Načíst historii hovorů", "info", [
		"participant",
		"call_type",
		"start",
		"end"
	]),
	reminders_create: tool("Create reminder", "Vytvořit připomínku", "warning", [
		"title",
		"due",
		"list",
		"priority"
	]),
	reminders_fetch: tool("Read reminders", "Načíst připomínky", "info", [
		"lists",
		"query",
		"completed",
		"start",
		"end"
	]),
	reminders_lists: tool("List reminder lists", "Vypsat seznamy připomínek", "info"),
	weather_current: tool("Read current weather", "Zjistit aktuální počasí", "info", ["latitude", "longitude"]),
	weather_daily: tool("Read daily forecast", "Načíst denní předpověď", "info", [
		"latitude",
		"longitude",
		"days"
	]),
	weather_hourly: tool("Read hourly forecast", "Načíst hodinovou předpověď", "info", [
		"latitude",
		"longitude",
		"hours"
	]),
	weather_minute: tool("Read minute forecast", "Načíst minutovou předpověď", "info", [
		"latitude",
		"longitude",
		"minutes"
	])
} };
function contactValue(contact) {
	return {
		id: contact.id,
		name: contact.name
	};
}
function objectValue(value) {
	return value !== null && typeof value === "object" && !Array.isArray(value) ? value : void 0;
}
function nonemptyString(value) {
	return typeof value === "string" && value.trim().length > 0 ? value.trim() : void 0;
}
function sameContact(left, right) {
	if (left === right) return true;
	if (left.includes("@") && !left.endsWith("@s.whatsapp.net") || right.includes("@") && !right.endsWith("@s.whatsapp.net")) return false;
	const leftPhone = left.replace(/@s\.whatsapp\.net$/i, "").replace(/[^0-9]/g, "");
	const rightPhone = right.replace(/@s\.whatsapp\.net$/i, "").replace(/[^0-9]/g, "");
	return leftPhone.length >= 7 && leftPhone === rightPhone;
}
function contactName(value, identifier) {
	const ids = [
		"jid",
		"id",
		"identifier",
		"chat_jid",
		"chatJid",
		"phone",
		"phoneNumber",
		"phone_number",
		"number",
		"wa_id"
	].map((key) => nonemptyString(value[key])).filter((candidate) => candidate !== void 0);
	const phoneNumbers = value["phoneNumbers"];
	if (Array.isArray(phoneNumbers)) for (const phone of phoneNumbers) {
		const item = objectValue(phone);
		const candidate = nonemptyString(item?.["value"] ?? item?.["number"] ?? phone);
		if (candidate !== void 0) ids.push(candidate);
	}
	if (!ids.some((candidate) => sameContact(candidate, identifier))) return void 0;
	return [
		"displayName",
		"display_name",
		"fullName",
		"full_name",
		"formattedName",
		"pushName",
		"push_name",
		"subject",
		"title",
		"chatName",
		"name"
	].map((key) => nonemptyString(value[key])).find((candidate) => candidate !== void 0 && !sameContact(candidate, identifier))?.slice(0, 100);
}
function findContactName(result, identifier) {
	const pending = [result];
	let inspected = 0;
	while (pending.length > 0 && inspected < 100) {
		const value = pending.shift();
		inspected += 1;
		if (Array.isArray(value)) {
			pending.push(...value.slice(0, 100));
			continue;
		}
		const record = objectValue(value);
		if (record === void 0) continue;
		const name = contactName(record, identifier);
		if (name !== void 0) return name;
		for (const key of [
			"structuredContent",
			"content",
			"contacts",
			"chats",
			"chat",
			"results",
			"items",
			"data"
		]) {
			const nested = record[key];
			if (nested !== void 0) pending.push(nested);
		}
		const text = nonemptyString(record["text"]);
		if (text !== void 0 && (text.startsWith("{") || text.startsWith("["))) try {
			pending.push(JSON.parse(text));
		} catch {}
	}
}
function findWellnessName(result, kind, identifier) {
	const pending = [{
		value: result,
		context: "service"
	}];
	let inspected = 0;
	while (pending.length > 0 && inspected < 500) {
		const entry = pending.shift();
		inspected += 1;
		if (Array.isArray(entry.value)) {
			pending.push(...entry.value.slice(0, 500).map((value) => ({
				value,
				context: entry.context
			})));
			continue;
		}
		const item = objectValue(entry.value);
		if (item === void 0) continue;
		const id = item[`${kind}_id`] ?? (entry.context === kind ? item["id"] : void 0);
		if ((typeof id === "number" || typeof id === "string") && String(id) === identifier) {
			const name = kind === "service" ? nonemptyString(item["service_name"]) ?? nonemptyString(item["title"]) ?? (entry.context === kind ? nonemptyString(item["name"]) : void 0) : nonemptyString(item["therapist_name"]) ?? nonemptyString(item["full_name"]) ?? (entry.context === kind ? nonemptyString(item["name"]) : void 0) ?? [nonemptyString(item["first_name"]), nonemptyString(item["last_name"])].filter(Boolean).join(" ");
			if (name !== void 0 && name.length > 0) return name.slice(0, 100);
		}
		for (const [key, value] of Object.entries(item)) {
			if (value === null || typeof value !== "object") {
				if (key === "text") {
					const text = nonemptyString(value);
					if (text?.startsWith("{") || text?.startsWith("[")) try {
						pending.push({
							value: JSON.parse(text),
							context: entry.context
						});
					} catch {}
				}
				continue;
			}
			const context = [
				"therapists",
				"therapist",
				"staff"
			].includes(key) ? "therapist" : ["services", "service"].includes(key) ? "service" : entry.context;
			pending.push({
				value,
				context
			});
		}
	}
}
function findMessage(result, identifier) {
	const pending = [result];
	let inspected = 0;
	while (pending.length > 0 && inspected < 100) {
		const value = pending.shift();
		inspected += 1;
		if (Array.isArray(value)) {
			pending.push(...value.slice(0, 100));
			continue;
		}
		const record = objectValue(value);
		if (record === void 0) continue;
		const id = nonemptyString(record["message_id"] ?? record["messageId"] ?? record["id"]);
		if (id === identifier) {
			const text = nonemptyString(record["body"] ?? record["text"] ?? record["caption"] ?? record["content"]);
			const chatId = nonemptyString(record["chat_jid"] ?? record["chatJid"] ?? record["remoteJid"]);
			return {
				id,
				...text === void 0 ? {} : { text },
				...chatId === void 0 ? {} : { chatId }
			};
		}
		for (const key of [
			"structuredContent",
			"content",
			"message",
			"messages",
			"results",
			"items",
			"data"
		]) {
			const nested = record[key];
			if (nested !== void 0) pending.push(nested);
		}
		const text = nonemptyString(record["text"]);
		if (text !== void 0 && (text.startsWith("{") || text.startsWith("["))) try {
			pending.push(JSON.parse(text));
		} catch {}
	}
}
function calendarEvent(result, identifier, occurrence) {
	const pending = [result];
	let inspected = 0;
	while (pending.length > 0 && inspected < 1e3) {
		const value = pending.shift();
		inspected += 1;
		if (Array.isArray(value)) {
			pending.push(...value.slice(0, 1e3));
			continue;
		}
		const item = objectValue(value);
		if (item === void 0) continue;
		if (item["isError"] === true) continue;
		if (nonemptyString(item["identifier"]) === identifier) {
			const start = nonemptyString(item["startDate"] ?? item["start"]);
			const sameOccurrence = occurrence === void 0 || start !== void 0 && (start.slice(0, 16) === occurrence.slice(0, 16) || /[zZ]|[+-]\d\d:?\d\d$/.test(start) && /[zZ]|[+-]\d\d:?\d\d$/.test(occurrence) && Date.parse(start) === Date.parse(occurrence));
			const title = nonemptyString(item["name"] ?? item["title"]);
			if (sameOccurrence && title !== void 0) {
				const calendarValue = item["calendar"] ?? item["eventCalendar"];
				const calendar = nonemptyString(calendarValue) ?? nonemptyString(objectValue(calendarValue)?.["name"]) ?? nonemptyString(objectValue(calendarValue)?.["title"]) ?? nonemptyString(item["calendarName"]);
				const end = nonemptyString(item["endDate"] ?? item["end"]);
				return {
					title: title.slice(0, 200),
					...occurrence === void 0 || start === void 0 ? {} : { start },
					...occurrence === void 0 || end === void 0 ? {} : { end },
					...calendar === void 0 ? {} : { calendar }
				};
			}
		}
		for (const key of [
			"structuredContent",
			"content",
			"events",
			"results",
			"items",
			"data",
			"@graph"
		]) if (item[key] !== void 0) pending.push(item[key]);
		const text = nonemptyString(item["text"]);
		if (text?.startsWith("{") || text?.startsWith("[")) try {
			pending.push(JSON.parse(text));
		} catch {}
	}
}
function eventLookupWindow(occurrence) {
	const parsed = occurrence === void 0 ? /* @__PURE__ */ new Date() : /* @__PURE__ */ new Date(`${occurrence.slice(0, 10)}T12:00:00Z`);
	const center = Number.isNaN(parsed.getTime()) ? /* @__PURE__ */ new Date() : parsed;
	const day = 1440 * 60 * 1e3;
	return {
		start: (/* @__PURE__ */ new Date(center.getTime() - (occurrence === void 0 ? 30 : 2) * day)).toISOString(),
		end: new Date(center.getTime() + (occurrence === void 0 ? 365 : 2) * day).toISOString()
	};
}
function contactIdentifierKey(pluginId, toolName) {
	if (pluginId === "whatsapp") {
		if ([
			"send_message",
			"send_file",
			"send_audio_message"
		].includes(toolName)) return "recipient";
		if (["get_contact_chats", "get_last_interaction"].includes(toolName)) return "jid";
		if (toolName === "get_direct_chat_by_contact") return "sender_phone_number";
	}
	if (pluginId === "imcp" && toolName === "phone_call") return "phoneNumber";
}
function chatIdentifierKey(pluginId, toolName) {
	if (pluginId !== "whatsapp") return void 0;
	if ([
		"download_media",
		"get_chat",
		"list_messages",
		"sync_chat_history"
	].includes(toolName)) return "chat_jid";
	if ([
		"send_message",
		"send_file",
		"send_audio_message"
	].includes(toolName)) return "recipient";
}
const labels = {
	account: {
		en: "Account",
		cs: "Účet"
	},
	address: {
		en: "Address",
		cs: "Adresa"
	},
	after: {
		en: "After",
		cs: "Po"
	},
	before: {
		en: "Before",
		cs: "Před"
	},
	calendar: {
		en: "Calendar",
		cs: "Kalendář"
	},
	calendars: {
		en: "Calendars",
		cs: "Kalendáře"
	},
	call_type: {
		en: "Call type",
		cs: "Typ hovoru"
	},
	category: {
		en: "Category",
		cs: "Kategorie"
	},
	chat_jid: {
		en: "Chat",
		cs: "Chat"
	},
	completed: {
		en: "Completed",
		cs: "Dokončené"
	},
	confirm: {
		en: "Create binding booking",
		cs: "Vytvořit závaznou rezervaci"
	},
	count: {
		en: "Count",
		cs: "Počet"
	},
	days: {
		en: "Days",
		cs: "Dny"
	},
	destinationAddress: {
		en: "Destination",
		cs: "Cíl"
	},
	destinationCoordinates: {
		en: "Destination coordinates",
		cs: "Souřadnice cíle"
	},
	destinationLatitude: {
		en: "Destination latitude",
		cs: "Zeměpisná šířka cíle"
	},
	destinationLongitude: {
		en: "Destination longitude",
		cs: "Zeměpisná délka cíle"
	},
	device: {
		en: "Device",
		cs: "Zařízení"
	},
	due: {
		en: "Due",
		cs: "Termín"
	},
	email: {
		en: "Email",
		cs: "E-mail"
	},
	emailAddresses: {
		en: "Email addresses",
		cs: "E-mailové adresy"
	},
	end: {
		en: "End",
		cs: "Konec"
	},
	familyName: {
		en: "Family name",
		cs: "Příjmení"
	},
	from: {
		en: "From",
		cs: "Od"
	},
	givenName: {
		en: "Given name",
		cs: "Jméno"
	},
	hours: {
		en: "Hours",
		cs: "Hodiny"
	},
	id: {
		en: "Message ID",
		cs: "ID zprávy"
	},
	identifier: {
		en: "Identifier",
		cs: "Identifikátor"
	},
	isRecurring: {
		en: "Recurring",
		cs: "Opakování"
	},
	jid: {
		en: "Contact",
		cs: "Kontakt"
	},
	lat: {
		en: "Latitude",
		cs: "Zeměpisná šířka"
	},
	latitude: {
		en: "Latitude",
		cs: "Zeměpisná šířka"
	},
	limit: {
		en: "Limit",
		cs: "Limit"
	},
	offset: {
		en: "Offset",
		cs: "Posun"
	},
	page: {
		en: "Page",
		cs: "Stránka"
	},
	cursor: {
		en: "Continuation cursor",
		cs: "Pokračovací kurzor"
	},
	list: {
		en: "Reminder list",
		cs: "Seznam připomínek"
	},
	lists: {
		en: "Reminder lists",
		cs: "Seznamy připomínek"
	},
	location: {
		en: "Location",
		cs: "Místo"
	},
	lon: {
		en: "Longitude",
		cs: "Zeměpisná délka"
	},
	longitude: {
		en: "Longitude",
		cs: "Zeměpisná délka"
	},
	mapType: {
		en: "Map type",
		cs: "Typ mapy"
	},
	media_path: {
		en: "File path",
		cs: "Cesta k souboru"
	},
	message: {
		en: "Message text",
		cs: "Text zprávy"
	},
	message_id: {
		en: "Message ID",
		cs: "ID zprávy"
	},
	minutes: {
		en: "Minutes",
		cs: "Minuty"
	},
	name: {
		en: "Name",
		cs: "Jméno"
	},
	note: {
		en: "Note",
		cs: "Poznámka"
	},
	organizationName: {
		en: "Organization",
		cs: "Organizace"
	},
	originAddress: {
		en: "Origin",
		cs: "Výchozí bod"
	},
	originCoordinates: {
		en: "Origin coordinates",
		cs: "Souřadnice počátku"
	},
	originLatitude: {
		en: "Origin latitude",
		cs: "Zeměpisná šířka počátku"
	},
	originLongitude: {
		en: "Origin longitude",
		cs: "Zeměpisná délka počátku"
	},
	part: {
		en: "Attachment part",
		cs: "Část přílohy"
	},
	participant: {
		en: "Participant",
		cs: "Účastník"
	},
	participants: {
		en: "Participants",
		cs: "Účastníci"
	},
	person: {
		en: "Person",
		cs: "Osoba"
	},
	phone: {
		en: "Phone",
		cs: "Telefon"
	},
	phoneNumber: {
		en: "Phone number",
		cs: "Telefonní číslo"
	},
	phoneNumbers: {
		en: "Phone numbers",
		cs: "Telefonní čísla"
	},
	place: {
		en: "Place",
		cs: "Místo"
	},
	priority: {
		en: "Priority",
		cs: "Priorita"
	},
	query: {
		en: "Search query",
		cs: "Hledaný text"
	},
	radius: {
		en: "Radius",
		cs: "Poloměr"
	},
	recipient: {
		en: "Recipient",
		cs: "Příjemce"
	},
	refresh: {
		en: "Refresh",
		cs: "Aktualizovat"
	},
	sender_phone_number: {
		en: "Sender",
		cs: "Odesílatel"
	},
	service_id: {
		en: "Service ID",
		cs: "ID služby"
	},
	sort_by: {
		en: "Sort by",
		cs: "Řadit podle"
	},
	span: {
		en: "Deletion range",
		cs: "Rozsah smazání"
	},
	start: {
		en: "Start",
		cs: "Začátek"
	},
	therapist_id: {
		en: "Therapist ID",
		cs: "ID masérky"
	},
	title: {
		en: "Title",
		cs: "Název"
	},
	to: {
		en: "To",
		cs: "Do"
	},
	transportType: {
		en: "Transport",
		cs: "Doprava"
	},
	upcoming_only: {
		en: "Upcoming only",
		cs: "Jen budoucí"
	}
};
function message(key, fallback, params) {
	return {
		key,
		fallback,
		...params === void 0 ? {} : { params }
	};
}
function argumentsRecord(value) {
	return value !== null && typeof value === "object" && !Array.isArray(value) ? value : {};
}
function targetValue(value) {
	if (typeof value === "string" && value.length > 0) return value.slice(0, 100);
	if (typeof value === "number" && Number.isFinite(value)) return String(value);
}
function scopedGrant(pluginId, key, value) {
	const label = labels[key] ?? {
		en: key,
		cs: key
	};
	return {
		id: key,
		label: message(`${pluginId}.scope.${key}`, {
			en: `${label.en}: {target}`,
			cs: `${label.cs}: {target}`
		}, { target: value.slice(0, 100) }),
		predicates: [{
			path: `/${key}`,
			operator: "equals",
			value
		}],
		durations: ["hour"]
	};
}
var ConnectedApprovalPlugin = class {
	id;
	contacts;
	version = "1.0.0";
	normalizationVersion = 2;
	constructor(id, contacts) {
		this.id = id;
		this.contacts = contacts;
	}
	async describe(input) {
		const definition = CONNECTED_TOOL_DEFINITIONS[this.id][input.toolName];
		if (definition === void 0) return createGenericDescription(input, "plugin.tool_unknown");
		const args = argumentsRecord(input.arguments);
		const contactKey = contactIdentifierKey(this.id, input.toolName);
		const contactId = contactKey === void 0 ? void 0 : nonemptyString(args[contactKey]);
		const chatKey = chatIdentifierKey(this.id, input.toolName);
		const chatId = chatKey === void 0 ? void 0 : nonemptyString(args[chatKey]);
		let contact;
		if (contactId !== void 0) {
			let name;
			if (this.contacts !== void 0) try {
				name = findContactName(await this.contacts.findContact(input.upstreamId, this.id, contactId), contactId);
			} catch {}
			contact = {
				id: contactId,
				name: name ?? null
			};
		}
		let chat;
		if (chatId !== void 0) {
			let name = contactId === chatId ? contact?.name ?? void 0 : void 0;
			if (name === void 0 && this.contacts?.findChat !== void 0) try {
				name = findContactName(await this.contacts.findChat(input.upstreamId, chatId), chatId);
			} catch {}
			if (name === void 0 && this.contacts !== void 0) try {
				name = findContactName(await this.contacts.findContact(input.upstreamId, "whatsapp", chatId), chatId);
			} catch {}
			chat = {
				id: chatId,
				name: name ?? null
			};
		}
		const messageId = this.id === "whatsapp" ? nonemptyString(args["message_id"]) : void 0;
		let referencedMessage;
		if (messageId !== void 0 && this.contacts?.findMessage !== void 0) try {
			referencedMessage = findMessage(await this.contacts.findMessage(input.upstreamId, messageId), messageId);
		} catch {}
		if (chat === void 0 && referencedMessage?.chatId !== void 0) {
			let name;
			if (this.contacts?.findChat !== void 0) try {
				name = findContactName(await this.contacts.findChat(input.upstreamId, referencedMessage.chatId), referencedMessage.chatId);
			} catch {}
			chat = {
				id: referencedMessage.chatId,
				name: name ?? null
			};
		}
		let serviceName;
		let therapistName;
		if (this.id === "krkonoskewellness" && (input.toolName === "book" || input.toolName === "availability") && (args["service_id"] !== void 0 || args["therapist_id"] !== void 0) && this.contacts?.listWellnessServices !== void 0) try {
			const catalog = await this.contacts.listWellnessServices(input.upstreamId);
			const serviceId = args["service_id"];
			const therapistId = args["therapist_id"];
			if (typeof serviceId === "string" || typeof serviceId === "number") serviceName = findWellnessName(catalog, "service", String(serviceId));
			if (typeof therapistId === "string" || typeof therapistId === "number") therapistName = findWellnessName(catalog, "therapist", String(therapistId));
		} catch {}
		const deletingEvent = this.id === "imcp" && input.toolName === "events_delete";
		const eventId = deletingEvent ? nonemptyString(args["identifier"]) : void 0;
		const occurrence = deletingEvent ? nonemptyString(args["start"]) : void 0;
		let event;
		if (eventId !== void 0 && this.contacts?.findCalendarEvents !== void 0) try {
			const window = eventLookupWindow(occurrence);
			event = calendarEvent(await this.contacts.findCalendarEvents(input.upstreamId, window.start, window.end), eventId, occurrence);
		} catch {}
		const fields = [...definition.fields, ...Object.keys(args).filter((key) => !definition.fields.includes(key)).sort()].flatMap((key) => {
			const value = args[key];
			if (value === void 0) return [];
			if (deletingEvent && (key === "identifier" || key === "span")) return [];
			const wellnessField = this.id === "krkonoskewellness" && (input.toolName === "book" || input.toolName === "availability");
			const label = wellnessField && key === "service_id" ? {
				en: "Service",
				cs: "Služba"
			} : wellnessField && key === "therapist_id" ? {
				en: "Therapist",
				cs: "Masérka"
			} : this.id === "krkonoskewellness" && input.toolName === "book" && key === "start" ? {
				en: "Appointment",
				cs: "Termín"
			} : deletingEvent && key === "start" ? {
				en: "When",
				cs: "Kdy"
			} : wellnessField && key === "confirm" ? {
				en: "Booking",
				cs: "Rezervace"
			} : labels[key] ?? {
				en: key,
				cs: key
			};
			return [{
				label: message(`${this.id}.field.${key}`, label),
				value: key === chatKey && chat !== void 0 ? contactValue(chat) : key === contactKey && contact !== void 0 ? contactValue(contact) : wellnessField && key === "service_id" && (typeof value === "number" || typeof value === "string") ? {
					id: value,
					name: serviceName ?? null
				} : wellnessField && key === "therapist_id" && (typeof value === "number" || typeof value === "string") ? {
					id: value,
					name: therapistName ?? null
				} : structuredClone(value)
			}];
		});
		if (deletingEvent) {
			fields.unshift({
				label: message("imcp.field.event", {
					en: "Event",
					cs: "Událost"
				}),
				value: event?.title ?? null
			});
			if (event?.end !== void 0) fields.push({
				label: message("imcp.field.event_end", {
					en: "Ends",
					cs: "Konec"
				}),
				value: event.end
			});
			if (event?.calendar !== void 0) fields.push({
				label: message("imcp.field.event_calendar", {
					en: "Calendar",
					cs: "Kalendář"
				}),
				value: event.calendar
			});
			fields.push({
				label: message("imcp.field.deletion_scope", {
					en: "Deletion scope",
					cs: "Rozsah smazání"
				}),
				value: args["span"] === "futureEvents" ? "futureEvents" : "thisEvent"
			});
			if (occurrence === void 0) fields.push({
				label: message("imcp.field.occurrence_status", {
					en: "Occurrence",
					cs: "Výskyt"
				}),
				value: null
			});
			fields.push({
				label: message("imcp.field.identifier", labels["identifier"]),
				value: eventId ?? ""
			});
		}
		if (referencedMessage?.text !== void 0) fields.push({
			label: message(`${this.id}.field.message_text`, {
				en: "Message text",
				cs: "Text zprávy"
			}),
			value: referencedMessage.text
		});
		if (chatKey === void 0 && chat !== void 0) fields.unshift({
			label: message(`${this.id}.field.chat_jid`, labels["chat_jid"]),
			value: contactValue(chat)
		});
		const rawTarget = definition.fields.map((key) => targetValue(args[key])).find((value) => value !== void 0);
		const namedTarget = chat?.name !== null && chat?.name !== void 0 ? chat : contact?.name !== null && contact?.name !== void 0 ? contact : void 0;
		const bookingTarget = this.id === "krkonoskewellness" && input.toolName === "book" ? serviceName ?? (targetValue(args["service_id"]) === void 0 ? void 0 : `#${args["service_id"]}`) : void 0;
		const target = deletingEvent ? event?.title : namedTarget === void 0 ? bookingTarget || (this.id === "krkonoskewellness" && input.toolName === "availability" ? serviceName : void 0) || rawTarget : `${namedTarget.name} (${namedTarget.id})`.slice(0, 200);
		const risk = this.id === "krkonoskewellness" && input.toolName === "book" && args["confirm"] !== true ? "info" : definition.risk;
		const sections = [{
			id: "request",
			heading: message(`${this.id}.section.request`, {
				en: "Requested operation",
				cs: "Požadovaná operace"
			}),
			fields,
			risk
		}];
		if (Object.keys(args).length > 0) sections.push({
			id: "technical",
			heading: message(`${this.id}.section.technical`, {
				en: "All arguments",
				cs: "Všechny argumenty"
			}),
			fields: [{
				label: message(`${this.id}.field.arguments`, {
					en: "Tool arguments",
					cs: "Argumenty nástroje"
				}),
				value: structuredClone(args)
			}],
			risk: "info"
		});
		const scopeKey = definition.scopeKey;
		const rawScopeValue = scopeKey === void 0 ? void 0 : args[scopeKey];
		const scopeValue = typeof rawScopeValue === "string" && rawScopeValue.length > 0 ? rawScopeValue : void 0;
		const bookingPreview = this.id === "krkonoskewellness" && input.toolName === "book" && args["confirm"] !== true;
		return {
			source: "plugin",
			normalizedContext: structuredClone(args),
			sensitivePaths: [],
			title: message(`${this.id}.tool.${input.toolName}`, {
				en: bookingPreview ? target === void 0 ? "Preview booking" : "Preview booking: {target}" : this.id === "krkonoskewellness" && input.toolName === "book" ? target === void 0 ? "Wellness booking" : "Wellness booking: {target}" : target === void 0 ? definition.en : `${definition.en}: {target}`,
				cs: bookingPreview ? target === void 0 ? "Návrh rezervace" : "Návrh rezervace: {target}" : this.id === "krkonoskewellness" && input.toolName === "book" ? target === void 0 ? "Rezervace wellness služby" : "Rezervace: {target}" : target === void 0 ? definition.cs : `${definition.cs}: {target}`
			}, target === void 0 ? void 0 : { target }),
			sections,
			proposedScopes: scopeKey === void 0 || scopeValue === void 0 ? [] : [scopedGrant(this.id, scopeKey, scopeValue)]
		};
	}
};
//#endregion
//#region src/index.ts
function createPlugin(host) {
	return new ConnectedApprovalPlugin("imcp", host);
}
//#endregion
export { createPlugin };
