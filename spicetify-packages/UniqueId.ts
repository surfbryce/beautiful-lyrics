const GeneratedIds: Set<string> = new Set()

export function GetUniqueId(): string {
	// Keep generating ids until we find one we don't have
	while (true) {
		const id = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
			let r = Math.random() * 16 | 0,
				v = c == 'x' ? r : (r & 0x3 | 0x8)
	
			return v.toString(16)
		})

		if (GeneratedIds.has(id) === false) {
			// Add our id to our list
			GeneratedIds.add(id)

			// Return our id
			return id
		}
	}
}