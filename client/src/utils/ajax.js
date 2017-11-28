export default function ajax (url, opts = {}, onProgress) {
  return new Promise((resolve, reject) => {
    var xhr = new XMLHttpRequest()
    xhr.open(opts.method || 'get', url)
    for (var k in opts.headers || {}) {
      xhr.setRequestHeader(k, opts.headers[k])
    }
    xhr.onload = e => resolve(e.target.responseText)
    xhr.onerror = reject
    if (xhr.upload && onProgress) {
      xhr.upload.onprogress = onProgress
    }
    xhr.send(opts.body)
  })
}
