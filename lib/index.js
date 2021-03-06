const _app = require('./app.js');
const error = require('./error.js');
const queue = require('./queue.js');
const utils = require('./utils.js');

const axios = require('axios');
const qs = require('querystring');

const originalURL = 'https://openapi.band.us';

module.exports = {
    app: _app,
    init: (callbackFunc) => {

        if(typeof callbackFunc !== 'function') 
            throw new Error('callbackFunc parameter is not function');

        if(_app.config.access_token === '')
            return callbackFunc(new Error('access_token is undefined'));
    
        const query = '?' + qs.stringify({
            access_token: _app.config.access_token
        });
    
        axios.get(originalURL + '/v2.1/bands' + query).then(response => {
            if(error(response.data)) {
                return callbackFunc(new Error(';band-api::init()'));
            }
        
            _app.bands = response.data.result_data.bands;
           queue.dequeues();
    
            return callbackFunc();
        });
        
    },

    posts: (callbackFunc, _locale = 'ko-KR') => {

        if(typeof callbackFunc !== 'function') 
            throw new Error('callbackFunc parameter is not function');

        if(_app.bands.length === 0) {
            queue.inqueue(module.exports.posts, callbackFunc, _locale);
            return;
        }
        
        try {
            for(let i = 0; i < _app.bands.length; i++) {

                let bandKey = _app.bands[i].band_key;

                let query = '?' + qs.stringify({
                    locale: _locale,
                    band_key: bandKey,
                    access_token: _app.config.access_token,
                });
    
                axios.get(originalURL + '/v2/band/posts' + query).then(response => {
                    if(error(response.data))
                        return callbackFunc(new Error(';band-api::posts()'));
                        
        
                    _app.posts[bandKey] = {};
                    _app.posts[bandKey].items = response.data.result_data.items;
                    _app.posts[bandKey].paging = response.data.result_data.paging;
                
                    callbackFunc(undefined, _app.bands[i].name, bandKey);
                    if(i === (_app.bands.length - 1))
                        queue.dequeues();
                });
            }
        } catch(err) {
            return callbackFunc(err);
        }
    },

    nextPosts: (callbackFunc, _bandIdxOrbandKey, _locale = 'ko-KR') => {

        if(typeof callbackFunc !== 'function') 
            throw new Error('callbackFunc parameter is not function');

        if(typeof _bandIdxOrbandKey !== 'string' && typeof _bandIdxOrbandKey !== 'number') {
            callbackFunc(new Error('Invalid parameter'));
            return false;
        }

        if(Object.keys(_app.posts).length === 0) {
            queue.inqueue(module.exports.nextPosts, callbackFunc, _bandIdxOrbandKey, _locale);
            return;
        }

        let { bandKey } = utils.convertKey(_bandIdxOrbandKey);

        const query = '?' + qs.stringify(_app.posts[bandKey].paging.next_params);
        axios.get(originalURL + '/v2/band/posts' + query).then(response => {
            
            if(error(response.data)) {
                return callbackFunc(new Error(';band-api::nextPosts()'));
            } 
            
            _app.posts[bandKey].items = response.data.result_data.items;
            _app.posts[bandKey].paging = response.data.result_data.paging;
            
            return callbackFunc(undefined, bandKey, _app.posts[bandKey].items);
        });
    },

    createPost: (callbackFunc, _bandIdxOrbandKey, _content, _doPush = false) => {

        if(typeof callbackFunc !== 'function') 
            throw new Error('callbackFunc parameter is not function');

        if(typeof _bandIdxOrbandKey !== 'string' && typeof _bandIdxOrbandKey !== 'number')
            return callbackFunc(new Error('Invalid parameter'));
    
        if(_app.bands.length === 0) {
            queue.inqueue(module.exports.createPost, callbackFunc, _bandIdxOrbandKey, _content, _doPush);
            return;
        }

        let { bandKey } = utils.convertKey(_bandIdxOrbandKey);
        
        let query = '?' + qs.stringify({
            content: _content,
            doPush: _doPush,
            band_key: bandKey,
            access_token: _app.config.access_token
        });

        axios.post(originalURL + '/v2.2/band/post/create' + query).then(response => {
            if(error(response.data))
                return callbackFunc(new Error(';band-api::createPost()'));
            
            return callbackFunc(undefined, bandKey, response.data.result_data.post_key);
        });
    },

    detailPost: (callbackFunc, _bandIdxOrbandKey, _postIdxOrpostKey) => {
        if(typeof callbackFunc !== 'function') 
            throw new Error('callbackFunc parameter is not function');

        if((typeof _postIdxOrpostKey !== 'string' && typeof _postIdxOrpostKey !== 'number') ||
        (typeof _bandIdxOrbandKey !== 'string' && typeof _bandIdxOrbandKey !== 'number')) 
            return callbackFunc(new Error('Invalid parameter'));
        
        if(Object.keys(_app.posts).length === 0) {
            queue.inqueue(module.exports.detailPost, callbackFunc, _bandIdxOrbandKey, _postIdxOrpostKey);
            return;
        }

        let { bandKey, postKey } = utils.convertKey(_bandIdxOrbandKey, _postIdxOrpostKey);

        const query = '?' + qs.stringify({
            access_token: _app.config.access_token,
            band_key: bandKey,
            post_key: postKey,
        });

        axios.get(originalURL + '/v2.1/band/post' + query).then(response => {
            
            if(error(response.data)) 
                return callbackFunc(new Error(';band-api::detailPost()'));
            
            return callbackFunc(undefined, bandKey, response.data.result_data.post);
        });
    },

    removePost: (callbackFunc, _bandIdxOrbandKey, _postIdxOrpostKey) => {

        if(typeof callbackFunc !== 'function') 
            throw new Error('callbackFunc parameter is not function');

        if((typeof _postIdxOrpostKey !== 'string' && typeof _postIdxOrpostKey !== 'number') ||
        (typeof _bandIdxOrbandKey !== 'string' && typeof _bandIdxOrbandKey !== 'number')) 
            return callbackFunc(new Error('Invalid parameter'));
        
        if(Object.keys(_app.posts).length === 0) {
            queue.inqueue(module.exports.removePost, callbackFunc, _bandIdxOrbandKey, _postIdxOrpostKey);
            return;
        }

        let { bandKey, postKey } = utils.convertKey(_bandIdxOrbandKey, _postIdxOrpostKey);

        const query = '?' + qs.stringify({
            access_token: _app.config.access_token,
            band_key: bandKey,
            post_key: postKey,
        });

        axios.post(originalURL + '/v2/band/post/remove' + query).then(response => {
            
            if(error(response.data))
                return callbackFunc(new Error(';band-api::removePost()'));
            
            return callbackFunc(undefined, bandKey);
        });
    }
}