/** Extended API
 *
 * @date 08/oct/2012
 * @update 08/mai/2021
 * @since MW 1.19
 */
/*jshint laxbreak: true */
/*global mw, $ */

( function () {
'use strict';

$.extend( mw.Api.prototype, {
	/**
	 * Edits a page
	 * @author [[pt:user:!Silent]]
	 * @param {object} info Edit params
	 * @return {jquery.Deferred}
	 */
	editPage: function ( info ) {
		var parametersAPI = {},
			apiDeferred = $.Deferred();

		$.extend( parametersAPI, info, {
			format: 'json',
			action: 'edit',
			title: info.title || mw.config.get( 'wgPageName' ),
			token: mw.user.tokens.get( 'csrfToken' )
		} );

		delete parametersAPI.done;

		this.post( parametersAPI )
			.done( function ( data ) {
				apiDeferred.resolve( data.edit );

				if ( !info.done ) {
					return;
				}

				if ( $.isFunction( info.done ) ) {
					info.done( data.edit );
				} else if ( $.isFunction( info.done.success ) ) {
					info.done.success( data.edit );
				}
			} )
			.fail( function ( code, result ) {
				if ( !info.done ) {
					console.log( 'mediawiki.api.ptwiki: edit failed (code: "' + result.error.code + '"; info: "' + result.error.info + '")' );
					return;
				}

				if ( !result && $.isFunction( info.done.unknownError ) ) {
					info.done.unknownError();
				} else if ( result.error && $.isFunction( info.done.apiError ) ) {
					info.done.apiError( result.error );
				}
			} );

		return apiDeferred.promise();
	},

	/**
	 * Gets the current text of a page
	 * @author Helder (https://github.com/he7d3r)
	 * @param {string} title Name of page
	 * @return {jquery.Deferred}
	 */
	getCurrentPageText: function ( title ) {
		var query, revisions,
			apiDeferred = $.Deferred();

		$.ajax( {
			url: mw.util.wikiScript( 'api' ),
			dataType: 'json',
			data: {
				'format': 'json',
				'action': 'query',
				'titles': title || mw.config.get( 'wgPageName' ),
				'prop': 'revisions',
				'rvprop': 'content',
				'indexpageids': '1'
			}
		} ).done( function ( data ) {
			query = data.query;

			if ( data.error !== undefined ) {
				mw.notify( 'Erro ao usar a API: ' + data.error.code + '. ' + data.error.info );
				apiDeferred.reject();
			} else if ( query && query.pages && query.pageids ) {
				revisions = query.pages[ query.pageids[ 0 ] ].revisions;
				apiDeferred.resolve( revisions && revisions[ 0 ][ '*' ] );
			} else {
				mw.notify( 'Houve um erro inesperado ao usar a API.' );
				apiDeferred.reject();
			}
		} ).fail( function () {
			// FIXME: Remove spinner? Cancel other requests?
			mw.notify( 'Houve um erro ao tentar usar a API para acessar a página atual.' );
			apiDeferred.reject();
		} );

		// Return the promise
		return apiDeferred.promise();
	},

	/**
	 * Gets a list of users of a target group
	 * @author Helder (https://github.com/he7d3r)
	 * @param {string} group Group name
	 * @return {jquery.Deferred}
	 */
	getUsersInGroup: function ( group ) {
		var apiDeferred = $.Deferred();

		this.get( {
			list: 'allusers',
			augroup: group,
			aulimit: 500
		} )
		.done( function ( data ) {
			apiDeferred.resolve(
				$.map( data.query.allusers, function ( user ) {
					return user.name;
				} )
			);
		} )
		.fail( apiDeferred.reject );

		return apiDeferred.promise();
	},

	/**
	 * Gets the total edits by a user in a certain time period
	 * @author Helder (https://github.com/he7d3r)
	 * @return {jquery.Deferred}
	 */
	getTotalEditsByUser: function ( userName, from, to ) {
		var apiDeferred = $.Deferred(),
			mwAPI = this,
			params = {
				list: 'usercontribs',
				ucstart: from,
				ucend: to,
				ucuser: userName,
				ucdir: 'newer',
				ucprop: 'sizediff',
				uclimit: 500
			},
			total = 0,
			doRequest = function ( ucstart ) {
				if ( ucstart ) {
					params.ucstart = ucstart;
				}

				mwAPI.get( params )
					.done( function ( data ) {
						total += data.query.usercontribs.length;

						if ( data[ 'query-continue' ] ) {
							doRequest( data[ 'query-continue' ].usercontribs.ucstart );
						} else {
							apiDeferred.resolve( total );
						}
					} )
					.fail( apiDeferred.reject );
			};

		doRequest();

		return apiDeferred.promise();
	}
} );

}() );
