import { generateRemoteUrl } from '@nextcloud/router'
import { getCurrentUser } from '@nextcloud/auth'

export const getRootPath = function() {
	if (getCurrentUser()) {
		return generateRemoteUrl(`dav/files/${getCurrentUser().uid}`)
	} else {
		return generateRemoteUrl('webdav').replace('/remote.php', '/public.php')
	}
}

export const generateDavUrl = (path) => {
	return `${getRootPath()}/${path}`
}

export const xmlToJson = (xml) => {
	let obj = {}

	if (xml.nodeType === 1) {
		if (xml.attributes.length > 0) {
			obj['@attributes'] = {}
			for (let j = 0; j < xml.attributes.length; j++) {
				const attribute = xml.attributes.item(j)
				obj['@attributes'][attribute.nodeName] = attribute.nodeValue
			}
		}
	} else if (xml.nodeType === 3) {
		obj = xml.nodeValue
	}

	if (xml.hasChildNodes()) {
		for (let i = 0; i < xml.childNodes.length; i++) {
			const item = xml.childNodes.item(i)
			const nodeName = item.nodeName
			if (typeof (obj[nodeName]) === 'undefined') {
				obj[nodeName] = xmlToJson(item)
			} else {
				if (typeof obj[nodeName].push === 'undefined') {
					const old = obj[nodeName]
					obj[nodeName] = []
					obj[nodeName].push(old)
				}
				obj[nodeName].push(xmlToJson(item))
			}
		}
	}
	return obj
}

export const parseXml = (xml) => {
	let dom = null
	try {
		dom = (new DOMParser()).parseFromString(xml, 'text/xml')
	} catch (e) {
		console.error('Failed to parse xml document', e)
	}
	return dom
}

export const xmlResponseToFilesList = (xml) => {
	const json = xmlToJson(parseXml(xml))
	const list = json['d:multistatus']['d:response']

	list.shift() // Remove the folder url
	const result = []
	for (const index in list) {
		const fullPath = list[index]['d:href']['#text']
		const pathDetails = fullPath.split('/')
		const details = list[index]['d:propstat'][0]['d:prop']
		const source = `${window.location.protocol}//${window.location.hostname}/${fullPath}`

		result.push({
			basename: pathDetails.slice(-1).join(''),
			filename: pathDetails.slice(-2).join('/'),
			source,
			mime: details['d:getcontenttype']['#text'],
			etag: details['d:getetag']['#text'],
			hasPreview: details['nc:has-preview']['#text'],
			fileid: details['oc:fileid']['#text'],
		})
	}
	return result
}

/**
 * Return the current directory, fallback to root
 *
 * @return {string}
 */
export const getCurrentDirectory = function() {
	const currentDirInfo = OCA?.Files?.App?.currentFileList?.dirInfo
		|| { path: '/', name: '' }

	// Make sure we don't have double slashes
	return `${currentDirInfo.path}/${currentDirInfo.name}`.replace(/\/\//gi, '/')
}
