/*
 * This file is part of ARSnova Mobile.
 * Copyright (C) 2011-2012 Christian Thomas Weber
 * Copyright (C) 2012-2014 The ARSnova Team
 *
 * ARSnova Mobile is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * ARSnova Mobile is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with ARSnova Mobile.  If not, see <http://www.gnu.org/licenses/>.
 */
Ext.define("ARSnova.controller.SessionImport", {
	extend: 'Ext.app.Controller',

	requires: [
		'ARSnova.model.Session',
		'ARSnova.model.Answer',
		'ARSnova.model.Question'
	],

	/**
	 * Import a single session from a JSON file.
	 */
	importSession: function(jsonContent) {
		var me = this;
		jsonContent = jsonContent.exportData;

		if (typeof jsonContent === "undefined" || typeof jsonContent.session === "undefined") {
			Ext.Msg.alert(Messages.IMP_ERROR, Messages.IMP_ERROR_FORMAT);
			return;
		}

		// extract session and save it to the database
		var storeSession = this.getElements(jsonContent.session, "ARSnova.model.Session");

		// attribute setup
		storeSession.each(function(e) {
			e._id     = undefined;
			e.creator = localStorage.getItem('login');
			
			e.create({
				success: function(response) {
					me.saveSessionAttachment(Ext.decode(response.responseText), jsonContent);
					me.loadSessionView(session);
				},
				failure: function(records, operation) {
					Ext.Msg.alert(Messages.IMP_ERROR, Messages.IMP_ERROR_SAVE);
				}
			});
		});
	},
	
	/**
	 * Load the imported Session
	 */
	loadSessionView: function(session){
		var me = this;
		
		var hideLoadMask = ARSnova.app.showLoadMask(Messages.LOAD_MASK_LOGIN);
		ARSnova.app.getController('Auth').roleSelect({
			mode: ARSnova.app.USER_ROLE_SPEAKER
		});
		ARSnova.app.getController('Sessions').login({
			keyword: session.keyword
		});
		hideLoadMask();
			
	},
	
	/**
	 * Saves the answers, questions, etc. from a session.
	 * 
	 * @param The
	 *            session retrieved after saving to the db e.g. for id
	 *            reference.
	 * @param The
	 *            content of the JSON file.
	 */
	saveSessionAttachment: function(session, jsonContent) {
		var me = this;
		if (typeof jsonContent.questions !== undefined) {
			var storeQuestions = this.getElements(jsonContent.questions, "ARSnova.model.Question");

			storeQuestions.each(function(q) {
				q._data._id       		= undefined;
				q._data._rev       		= undefined;
				q._data.sessionId     	= session._id;
				q._data.sessionKeyword 	= session.keyword;
				q.sessionId				= session._id;
				q.sessionKeyword 		= session.keyword;

				q.saveSkillQuestion({
					success: function(response) {
						var respQuestion = Ext.decode(response.responseText);
						if (typeof q.raw.answers !== undefined) {
							var answers = q.raw.answers;
						 	var storeAnswers = me.getElements(q.raw.answers, "ARSnova.model.Answer");	
							storeAnswers.each(function(a) {
								a.raw.user       		= undefined;
								a.raw.questionId 		= respQuestion._id;
								a.raw.questionVariant   = respQuestion.questionVariant;
								a.raw.sessionId 		= session._id;
								
								a.saveAnswer({
									success: function() {
										console.log("Answer saved successfully.");
									},
									failure: function(response, request) {
										console.log("Could not save answer");
										
									}
								});
							});	
						} else {
							console.log("No answers to import");
						}
					},
					failure: function() {
						console.log("Error while saving question to database.");
					}
				});
			});
		}
		
		
		// TODO var strgFBQuestions =
		// this.getElements(jsonContent.studentQuestions,
		// "ARSnova.model.Session"); // ???
	},
	
	/**
	 * Gets the ARSnova class objects from the json file.
	 */
	getElements: function(json, className) {
		var store = new Ext.data.Store({
			model: className,
			autoLoad: true, 
			data: eval('(' + JSON.stringify(json).trim() + ')')
		});
		return store;
	}
});