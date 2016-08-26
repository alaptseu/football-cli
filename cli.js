#!/usr/bin/env node

/*
* @Author: Manraj Singh
* @Date:   2016-08-24 12:21:30
* @Last Modified by:   Manraj Singh
* @Last Modified time: 2016-08-27 00:27:10
*/

'use strict';

const yargs = require('yargs');
const fs = require('fs');
const ora = require('ora');
const chalk = require('chalk');
const request = require('request');
const inquirer = require('inquirer');
const path = require('path');
const Table = require('cli-table');
const config = require('./config');
const league_ids = require('./league_ids');

const API_URL = 'http://api.football-data.org/v1/';
const headers = {
  'X-Auth-Token': config.API_KEY
};

const getURL = (endPoint) => {
  return API_URL+endPoint;
}

const argv = yargs
  .usage('$0 <command>')
  .command('scores', 'Get scores of past and live fixtures', (yargs) => {
    var argv = yargs
      .usage('Usage: $0 scores [options]')
      .alias('l', 'live').describe('l', 'Live scores')
      .example('sudo $0 scores -l')
      .argv;
  })
  .command('standings', 'Get standings of particular league', (yargs) => {
    var argv = yargs
      .usage('Usage: $0 standings [options]')
      .demand('l')
      .alias('l', 'league').describe('l', 'League to be searched')
      .example('sudo $0 standings -l')
      .argv;
    let id = league_ids[argv.l].id;

    request({ "url": getURL(`competitions/${id}/leagueTable`), "headers": headers }, (err, res, body) => {
      if(err){
        console.log("Sorry, an error occured");
      }
      else{
        var data = JSON.parse(body);
        var standing = data.standing;
        if(Array.isArray(standing)){
          var table = new Table({
            head: ['Rank', 'Team', 'Played', 'Goal Diff', 'Points'],
            colWidths: [ 7, 25, 10, 15, 10]
          });
          for(let i=0; i < standing.length; i++){
            let team = standing[i];
            table.push([ team.position, team.teamName, team.playedGames, team.goalDifference, team.points]);
          }
          console.log(table.toString());
        }
        else{

        }
      }
    });
  })
  .command('list', 'List of codes of various competitions', (yargs) => {
    var argv = yargs
      .usage('Usage: sudo $0 list [options]')
      .alias('r', 'refresh').describe('r', 'Refresh league ids').boolean('r')
      .example('sudo $0 config -r')
      .argv;
    if (argv.r){
      request({ "url": getURL("competitions"), "headers": headers }, (err, res, body) => {
        if(err){
          console.log("Sorry, an error occured");
        }
        else{
          var data = JSON.parse(body);
          let newLeagueIDs = {};
          for(let i=0;i<data.length;i++){
            let comp = data[i];
            newLeagueIDs[comp.league] = {
              "id": comp.id,
              "caption": comp.caption
            };
          }
          fs.writeFileSync(__dirname+'/league_ids.json', JSON.stringify(newLeagueIDs, null, 2), 'utf8');
        }
      });
    }
    else{
      var table = new Table({
        head: ['League', 'League Code'],
        colWidths: [ 40, 20]
      });
      for(let league in league_ids){
        table.push([ league_ids[league].caption, league]);
      }
      console.log(table.toString());
    }
  })
  .command('config', 'Change configuration and defaults', (yargs) => {
    const questions = [{
      type: 'input',
      name: 'API_KEY',
      message: 'Enter API KEY <leave blank incase unchanged>'
    }];
    inquirer.prompt(questions).then((answers) => {
      var obj = config;
      if (answers.API_KEY !== ''){
        obj.API_KEY = answers.API_KEY;
      }
      fs.writeFileSync(__dirname+'/config.json', JSON.stringify(obj, null, 2), 'utf8');
    });
  })
  .help('h')
  .alias('h', 'help')
  .argv;
