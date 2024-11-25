  //UPDATES
    //don't copy the sheet over to the main sheet right away. get long-to-solve problems if you have picks missing or messed up.
      //instead run the fill_all_sheets_possible with that copy commented out. if suceeds, then put it back in to copy over to main sheet.
    //I'm still hitting that 6min timeout for upste_scores_vs_master, then mark future picks incorrect, it's close with 38 entrants.
      //to solve it have been swapping the order in call_update_all_sheets. 
      //first update_scores_vs_master (completes in like 4 mins), then 10 sheets in the mark_futures times out. so just swap the order, run again.
      //once past the first round it doesnt timeout, so you can update to =3 to start at round3.. works for rest of tourney
  
  //First get everyone's brackets entered in.
    //Then delete everyone's info on Scoreboard, since this macro will fill in columns c,d,e,f.  So after this you can fill in the name/hometown stuff
    //Run the 'fill_all_sheets_points_possible' script.
    //This will go through all sheets and fill in the possible points for every game, every sheet (skips the default sheet nanes defined in outer loop statement).
    //at the end this will copy the sheet over the Live sheet, and delete from the Staging sheet

    //This will timeout, but just run int again since it will start on remaining sheets (already process are moved and deleted from this spreadsheet)
    //after this is run once, never run it again.
    
  //Now you are just updating the master tab with winner results.
    //upset_scores_vs_master
    //this goes through ALL games on all sheets, so it's not that efficient. It times out into the sweet 16.
    //But you can update it so after the first round is over
      //totals first round into D1
      //starts processing in round 2, so skipping all 32 games
      //uses the value in D1 as a start to total, instead of starting at 0.
    //fix this so it skips the scoring if it's already marked green/red. that should save a bunch of time.
    //last year I cheated and totaled the first round scores on top, then just used that # going forward to cumuldate the score.
    //and did the same this year. 

//setup to run on cell edits
//function onEdit (e){
//   call_update_all_sheets();
//}



function call_update_all_sheets(){
  update_scores_vs_master (2)  //pass round to start on. round 2 means start in first round
  mark_future_picks_incorrect (2)  //pass round to start on. round 2 means start in first round

}
 
//Globals
var app = SpreadsheetApp;
var bracketsSS = app.getActiveSpreadsheet();
var activeSheet = bracketsSS.getSheetByName("Master");
var teamSeedArray =  get_team_and_seed_array();
const GREEN = "#BBDFB1"
const RED = "#E9C9C9"


//////////////////////////////////////////////
function update_scores_vs_master(start_round) {
//////////////////////////////////////////////
//Goes through each sheet
//Marks each pick as right/wrong and scores it
//does not look if pick was marked previously, marks all picks on all sheets vs master
//stores winnersList from Masters, then compares vs each sheet and marks accordingly

  var app = SpreadsheetApp;
  var bracketsSS = app.getActiveSpreadsheet();
  var activeSheet = bracketsSS.getSheetByName("Master");
  activeSheet.getRange("C2:C65").setFontSize(10)
  activeSheet.getRange("E2:E65").setFontSize(10)
  activeSheet.getRange("G2:G65").setFontSize(10)
  activeSheet.getRange("I2:I65").setFontSize(10)
  activeSheet.getRange("K2:K65").setFontSize(10)
  activeSheet.getRange("M2:M65").setFontSize(10)
  activeSheet.getRange("B2:N65").setBackground(null)

  masterWinners = get_tabs_winners_array ("Master")

  var activeSheet
  var currentTotal = 0;
  var nextRoundWinnerRow = 0; // This is the row in the next round where the winner of the current game would be.  i.e. round 2 winner in row 12 goes to row 10 in next round

  var sheetsList = get_sheet_names();
  console.log(sheetsList)
  update_master_tab()
 
  //Loop through sheet names
  for (var i=0; i<sheetsList.length; i++){
    activeSheet = bracketsSS.getSheetByName(String(sheetsList[i]));
    currentWinners = get_tabs_winners_array (activeSheet.getName())
    currentTotal= 0;
    console.log("doing sheet " + sheetsList[i])

    
    //FIRST ROUND OVER  this puts the first round total in D1, and starts conting with that number
    //so you can just start at the 2nd round and use this total, saves time doesn't timeout
    activeSheet.getRange(1,4).setValue("=sum(D2:D65)")
    currentTotal = currentTotal + activeSheet.getRange(1,4).getValue()
    
    //outer loop counting through rounds
    for (round=start_round; round<=7; round++){ 

      //reset vars
      rowCountingInterval = Math.pow(2,round-1);
      roundTeamColumn = (round*2)-1
      roundScoreColumn = roundTeamColumn + 1

      //innerloop counting through rows
      row = 2
      //console.log("new round: round is " + round + " and counting interval is " + rowCountingInterval + " sheet:" + activeSheet.getName())

      do {
        if (masterWinners[roundTeamColumn][row] != ''){
          //Got a Winner marked in the Master Array
          //console.log("Master vs current pick:" + masterWinners[roundTeamColumn][row] + " vs " + currentWinners[roundTeamColumn][row]);

          //do comparision if master's tab is non-empty
          if (String(masterWinners[roundTeamColumn][row]) === String(currentWinners[roundTeamColumn][row])){
            //match, mark green
            //console.log("got a pick right")
            currentTotal = currentTotal + activeSheet.getRange(row,roundScoreColumn).getValue()
            activeSheet.getRange(row,roundTeamColumn).setBackground(GREEN)
            activeSheet.getRange(row,roundScoreColumn).setBackground(GREEN)
          }

          else{
            //console.log("got a pick wrong")
            //incorrect pick, color it red and put a 0 in the score column
            activeSheet.getRange(row,roundTeamColumn).setBackground(RED)
            activeSheet.getRange(row,roundScoreColumn).setBackground(RED)
            activeSheet.getRange(row,roundScoreColumn).setValue(0)
              
          }              
        }
          row = row + rowCountingInterval
        } while (row <=64)

    }//end of loop counting through rounds
      
    //console.log("finalTotal is: " + currentTotal)
    activeSheet.getRange("P1").setValue(currentTotal);
  }

  var currentDate = new Date();
  var datetime = (currentDate.getMonth()+1) + "/"
      + currentDate.getDate()  + " @ " 
      + currentDate.getHours() + ":"  
      + currentDate.getMinutes()

  activeSheet = bracketsSS.getSheetByName(String("Scoreboard"));
  activeSheet.getRange("B3").setValue(datetime)

  order_scoreboard_sheet()
  reorder_sheets()
}

function mark_future_picks_incorrect(start_round){

  var app = SpreadsheetApp;
  var bracketsSS = app.getActiveSpreadsheet();
  var sheetsList = get_sheet_names();
  console.log(sheetsList)

  //Loop through sheet names here
  for (var i=0; i<sheetsList.length; i++){
    activeSheet = bracketsSS.getSheetByName(String(sheetsList[i]));
    currentWinners = get_tabs_winners_array (activeSheet.getName())
    console.log("doing sheet " + sheetsList[i])

    //outer loop counting through rounds
    for (round=start_round; round<=6; round++){
      
      //reset vars
      rowCountingInterval = Math.pow(2,round-1);
      roundTeamColumn = (round*2)-1
      roundScoreColumn = roundTeamColumn + 1

      //innerloop counting through rows
      //console.log("future pick deletion...new round is " + round + " and counting interval is " + rowCountingInterval)
      row = 2
      do{
        //console.log("comparing this against zero " + "row" + row + " column" + roundScoreColumn + " " + activeSheet.getRange(row,roundScoreColumn).getValue())
        if(activeSheet.getRange(row,roundScoreColumn).getValue() === 0){
          //current pick was incorrect, see if you need to clear/zero out future ones
          //console.log("current pick was incorrect - " + activeSheet.getRange(row,roundTeamColumn).getValue())

          nextRoundWinnerRow = row - ((row - 2) % (rowCountingInterval*2)) //compilcated formula to figure out the row where the winner exists in next round
          //console.log("nextRoundWinnerRow:" + nextRoundWinnerRow + " NextRoundScoreColumn:" + (roundScoreColumn+2))

          if(activeSheet.getRange(row,roundTeamColumn).getValue() === activeSheet.getRange(nextRoundWinnerRow,roundTeamColumn+2).getValue()){
          //Next round team matches the current round team, which is an incorrect pick. zero out the next round pick
          //console.log("zeroing out this future pick")
          activeSheet.getRange(nextRoundWinnerRow,roundTeamColumn+2).setBackground("#E9C9C9")
          activeSheet.getRange(nextRoundWinnerRow,roundScoreColumn+2).setBackground("#E9C9C9")
          activeSheet.getRange(nextRoundWinnerRow,roundScoreColumn+2).setValue(0)
          }
        }
      row = row + rowCountingInterval
      } while (row <=64)  //end of counting through rows loop
    }// end of counting through rounds loop
  }

}


//////////////////////////////////////////////
function fill_all_sheets_points_possible() {
//////////////////////////////////////////////
//Step through all sheets and update the points possible
//This is only run once at the beginning when you enter people's brackets
  
  //First build the teamSeed Array.  Key: Value array so you can easily get a team's seed from the object.  
  var app = SpreadsheetApp;
  var bracketsSS = app.getActiveSpreadsheet();
  var activeSheet;
  var teamSeedArray =  get_team_and_seed_array();  //creates the Key: Value array so you can just say teamSeedArray["Duke"]  (the key) and returns the seed number value (the value)
  var expected_seed_array = get_expected_seed_array();

  var scoreboardArray = [[]] //array to write to Scoreboard Tab

  console.log(teamSeedArray)

  var i = 0; //CHANGE this to start on a later sheet if desired.  0 relative.
  var row;
  var round;
  var roundTeamColumn;  //= round *2 -1
  var roundScoreColumn; //= round *2 
  var rowCountingInterval; //round 2 counts by 2 cells, round 3 counts as 4, round 4 counts as 8, rd 5 as 16, 6 as 32
  var spacePointsPossible = 0;
  var teamName;
  var roundBasePointsList = [0,0,2,5,8,12,18,24]
  var sheetsList = get_sheet_names();
  var tabName
  var champStringList = [];
  var champString = [];
  console.log("SheetList: " + String(sheetsList))
 
//Loop through sheet names here
  for (var i; i<sheetsList.length; i++){
    tabName = String(sheetsList[i])
    if (tabName != "FrontPage" && tabName!= "Scoreboard" && tabName != "Master" ){

      activeSheet = bracketsSS.getSheetByName(tabName);
      console.log("Starting Sheet: " + String(activeSheet.getName()) + " ; sheet index" + String(i))
      tabWinners  = get_tabs_winners_array(tabName);
      
      //outer loop counting through rounds
      for (round=2; round<=7; round++){
        //reset vars for new round
        rowCountingInterval = Math.pow(2,round-1); //fun formula to determine how many rows to count by per round
        roundTeamColumn = (round*2)-1
        roundScoreColumn = roundTeamColumn + 1

        //console.log("new round: round is " + round + " and counting interval is " + rowCountingInterval)
        
        //innerloop counting through rows
        row = 2
        do {    //run loop from row 2 to row 64
            
          //1st get the round's base value
          roundBasePoints = roundBasePointsList[round]
            
          //2nd add the upset points value with base+upset
            //get expected seed in spot
            //teamName = activeSheet.getRange(row,roundTeamColumn).getValue(); old cell read
            teamName = tabWinners[roundTeamColumn][row]
            if (teamName == ""){
              console.log("!!Invalid Pick!! " + String(activeSheet.getName()) + " row=" + row + " column=" + roundTeamColumn)
            }
            //console.log(teamSeedArray[teamName])

            spacePointsPossible = roundBasePoints + (teamSeedArray[teamName] - expected_seed_array[row][roundTeamColumn])
            //console.log("Team name:" + teamName + "; Seed:" + teamSeedArray[teamName] + "; total points for space:" + spacePointsPossible)
            
          //3rd write value to space
            activeSheet.getRange(row,roundScoreColumn).setValue(spacePointsPossible)
                            
          row = row+ rowCountingInterval;
          } while (row <= 64); 
      }//end of round counter loop

      //format the sheet
      activeSheet.getRange("B2:N65").setBackground(null)
      activeSheet.getRange("C2:C65").setFontSize(10)
      activeSheet.getRange("E2:E65").setFontSize(10)
      activeSheet.getRange("G2:G65").setFontSize(10)
      activeSheet.getRange("I2:I65").setFontSize(10)
      activeSheet.getRange("K2:K65").setFontSize(10)
      activeSheet.getRange("M2:M65").setFontSize(10)
      activeSheet.getRange("P1").setValue(0)  ///holds currently scored games. next cell holds entire points poissible.
      activeSheet.getRange("P2").setValue(String("=sum(D2:D65,F2:F65,H2:H65,J2:J65,L2:L65,N2)"))
      activeSheet.getRange("C2:N65").setVerticalAlignment('middle')
      activeSheet.getRange("C2:N65").setHorizontalAlignment('left')
      
      //store info in scoreboardArray to write to Scoreboard page at end.
      scoreboardArray[i] = sheetsList[i]
      scoreboardArray[i].splice (0,0,"=" + tabName + "!P2")
      scoreboardArray[i].splice (0,0,"=" + tabName + "!P1")

      //figure out the champ string
      champStringList[0] = activeSheet.getRange("M2").getValue()
      champStringList[1] = activeSheet.getRange("K34").getValue()
      champStringList[2] = activeSheet.getRange("K2").getValue()
      //console.log(champStringList)

      if (champStringList[0] === champStringList[1]){
        champString = champStringList[0] + "/" + champStringList[2]
      }
      else{
        champString = champStringList[0] + "/" + champStringList[1]
      }

      scoreboardArray[i].push(champString)

      activeSheet = bracketsSS.getSheetByName("Scoreboard");
      activeSheet.getRange("C" + String(i+4)).setValue(scoreboardArray[i][0]);
      activeSheet.getRange("D" + String(i+4)).setValue(scoreboardArray[i][1]);
      activeSheet.getRange("E" + String(i+4)).setValue(scoreboardArray[i][2]);
      activeSheet.getRange("F" + String(i+4)).setValue(scoreboardArray[i][3]);

      //move_sheet_to_live(tabName)

    }//end of IF statement that skips non user sheets
  } //end of sheets counter loop

}
////////////////////////////////////////
function order_scoreboard_sheet(){
////////////////////////////////////////
//reorders the scoreboard page by score

  var app = SpreadsheetApp;
  var bracketsSS = app.getActiveSpreadsheet();
  var activeSheet = bracketsSS.getSheetByName("Scoreboard");
  var tabName

  var resultsArray = [[]]
  resultsArray = activeSheet.getRange("B4:H50").getValues();

  //trim off empty rows
  for(var i=0; i<resultsArray.length; i++){
    //console.log("length is: " + resultsArray.length)
    if (resultsArray[i][1] === ""){
      resultsArray.splice(i,1)
      i = i - 1
    }
  }

  var entrants = resultsArray.length;

  //sort Array by 2nd column (score)
  resultsArray.sort(compareSecondColumn);
  function compareSecondColumn(a, b) {
      if (a[1] === b[1]) {
          return 0;
      }
      else {
          return (a[1] > b[1]) ? -1 : 1;
      }
  }
  //console.log(resultsArray)

  //write to scoreboard sheet
  activeSheet.getRange("B4:H" + (resultsArray.length + 3)).setValues(resultsArray)
  activeSheet.getRange("B4:N60").setBackground(null)

  //color grey if current score = possible score

  for(row = 4; row < (resultsArray.length + 4); row++){
    current_score = resultsArray[row-4][1]
    max_score = resultsArray[row-4][2]

    if (current_score == max_score){
      activeSheet.getRange('B' + row + ':' + 'H' + row).setBackground('#f3f3f3')
    }
  }

  //when that is written, the formulas are replaced. so re-calculate the formulas and write
  tab_names = activeSheet.getRange("E4:E" + (3+entrants)).getValues();

  score_formulas = tab_names
  for (var i=0; i<entrants; i++){
    score_formulas[i][0] = "=" + tab_names[i] + "!P1"
    score_formulas[i][1] = score_formulas[i][0].replace("!P1", "!P2")
  }
  //console.log(score_formulas)
  activeSheet.getRange("C4:D" + (resultsArray.length + 3)).setValues(score_formulas)
}

////////////////////////////////////////////////////////////////////
function update_master_tab(){
//////////////////////////////////////////////////////////////////////
//update just the master tab, things are slightly different here
  var roundBasePointsList = [0,0,2,5,8,12,18,24];
  var expected_seed_array = get_expected_seed_array();
  var masterWinners = get_tabs_winners_array ("Master")


  activeSheet = bracketsSS.getSheetByName("Master");

      //outer loop counting through rounds
      for (round=2; round<=7; round++){
        
        //reset vars
        rowCountingInterval = Math.pow(2,round-1);
        roundTeamColumn = (round*2)-1
        roundScoreColumn = roundTeamColumn + 1

        //innerloop counting through rows
        row = 2
        //console.log("new round: round is " + round + " and counting interval is " + rowCountingInterval + " sheet:" + activeSheet.getName())

        do {
          if (masterWinners[roundTeamColumn][row] != ''){
            //got a pick, give it a score
            spacePointsPossible = 0;          
            
            //1st get the round's base value
            spacePointsPossible = roundBasePointsList[round]
          
            //2nd add the upset points value
            //get expected seed in spot
            teamName = masterWinners[roundTeamColumn][row]
                    
            spacePointsPossible = spacePointsPossible + (teamSeedArray[teamName] - expected_seed_array[row][roundTeamColumn])
            //console.log("Team name:" + teamName + "; Seed:" + teamSeedArray[teamName] + "; total points for space:" + spacePointsPossible)

            activeSheet.getRange(row,roundScoreColumn).setValue(spacePointsPossible)
            
          }
          row = row + rowCountingInterval
        } while (row <=64)

      }//end of loop counting through rounds

  }





///////////////////////////////////////////////////////
/////////////helper functions/////////////////////////////////////////
////////////////////////////////////////////////////////

function get_team_and_seed_array () {
/////////////////////////
//create teamSeed array from Master Tab
/////////////////////////
  
  var app = SpreadsheetApp;
  var bracketsSS = app.getActiveSpreadsheet();
  var activeSheet = bracketsSS.getSheetByName("Master");
  var row=2;

  var teamSeedArray = {};

  for (row=2; row <=65; row++){
  teamSeedArray[String(activeSheet.getRange(row,2).getValue())] = activeSheet.getRange(row,1).getValue()
  }

return teamSeedArray;
}

//////////////////////////////////////////////
function get_expected_seed_array () {
/////////////////////////
//create the expected seed in spot array.  
//Used to determine upset points by comparing current seed to this expected seed
//reference this by [ROW][COLUMN]
/////////////////////////
  
  var app = SpreadsheetApp;
  var bracketsSS = app.getActiveSpreadsheet();
  var activeSheet = bracketsSS.getSheetByName("Seeds");
  
  //build an array that is the Seeds tab.  [Rows], [Columns]. And want it to be 1 relative, not zero relative.
  //also accoutn for the headers on each sheet (columns 0,1,2 are worthless, rows 0,1 are worthelss
  //all back to back rows are duplcates of eachother, because starting in the second round. See Seeds sheet, rows 2,3 are merged
  

  //improve this to only hold the 8 unique rows. The row request coming in can map the incomming row to the correct array row.
  
  expectedSeedArray = [[]]
  expectedSeedArray[0] = [0] // row 0 doesn't exist
  expectedSeedArray[1] = [0] //row 1 is nothing round headers

  expectedSeedArray[2] = [0,0,0,1,1,1,1,1,1,1,1,1,1,1,1] //row 2 has the 1 seed all across columns 0,1,2 are nothing
  expectedSeedArray[3] = expectedSeedArray[2]
  expectedSeedArray[4] = [0,0,0,8,8,1,1,1,1,1,1,1,1,1,1]
  expectedSeedArray[5] = expectedSeedArray[4]
  expectedSeedArray[6] = [0,0,0,5,5,4,4,1,1,1,1,1,1,1,1]
  expectedSeedArray[7] = expectedSeedArray[6]
  expectedSeedArray[8] = [0,0,0,4,4,4,4,1,1,1,1,1,1,1,1]
  expectedSeedArray[9] = expectedSeedArray[8]
  expectedSeedArray[10] = [0,0,0,6,6,3,3,2,2,1,1,1,1,1,1]
  expectedSeedArray[11] = expectedSeedArray[10]
  expectedSeedArray[12] = [0,0,0,3,3,3,3,2,2,1,1,1,1,1,1]
  expectedSeedArray[13] = expectedSeedArray[12]
  expectedSeedArray[14] = [0,0,0,7,7,2,2,2,2,1,1,1,1,1,1]
  expectedSeedArray[15] = expectedSeedArray[14]
  expectedSeedArray[16] = [0,0,0,2,2,2,2,2,2,1,1,1,1,1,1]
  expectedSeedArray[17] = expectedSeedArray[16]

  //Now it just repeats for the next 3 quadrants.
  expectedSeedArray[18] = expectedSeedArray[2]
  expectedSeedArray[19] = expectedSeedArray[2]
  expectedSeedArray[20] = expectedSeedArray[4]
  expectedSeedArray[21] = expectedSeedArray[4]
  expectedSeedArray[22] = expectedSeedArray[6]
  expectedSeedArray[23] = expectedSeedArray[6]
  expectedSeedArray[24] = expectedSeedArray[8]
  expectedSeedArray[25] = expectedSeedArray[8]
  expectedSeedArray[26] = expectedSeedArray[10]
  expectedSeedArray[27] = expectedSeedArray[10]
  expectedSeedArray[28] = expectedSeedArray[12]
  expectedSeedArray[29] = expectedSeedArray[12]
  expectedSeedArray[30] = expectedSeedArray[14]
  expectedSeedArray[31] = expectedSeedArray[14]
  expectedSeedArray[32] = expectedSeedArray[16]
  expectedSeedArray[33] = expectedSeedArray[16]

  expectedSeedArray[34] = expectedSeedArray[2]
  expectedSeedArray[35] = expectedSeedArray[2]
  expectedSeedArray[36] = expectedSeedArray[4]
  expectedSeedArray[37] = expectedSeedArray[4]
  expectedSeedArray[38] = expectedSeedArray[6]
  expectedSeedArray[39] = expectedSeedArray[6]
  expectedSeedArray[40] = expectedSeedArray[8]
  expectedSeedArray[41] = expectedSeedArray[8]
  expectedSeedArray[42] = expectedSeedArray[10]
  expectedSeedArray[43] = expectedSeedArray[10]
  expectedSeedArray[44] = expectedSeedArray[12]
  expectedSeedArray[45] = expectedSeedArray[12]
  expectedSeedArray[46] = expectedSeedArray[14]
  expectedSeedArray[47] = expectedSeedArray[14]
  expectedSeedArray[48] = expectedSeedArray[16]
  expectedSeedArray[49] = expectedSeedArray[16]

  expectedSeedArray[50] = expectedSeedArray[2]
  expectedSeedArray[51] = expectedSeedArray[2]
  expectedSeedArray[52] = expectedSeedArray[4]
  expectedSeedArray[53] = expectedSeedArray[4]
  expectedSeedArray[54] = expectedSeedArray[6]
  expectedSeedArray[55] = expectedSeedArray[6]
  expectedSeedArray[56] = expectedSeedArray[8]
  expectedSeedArray[57] = expectedSeedArray[8]
  expectedSeedArray[58] = expectedSeedArray[10]
  expectedSeedArray[59] = expectedSeedArray[10]
  expectedSeedArray[60] = expectedSeedArray[12]
  expectedSeedArray[61] = expectedSeedArray[12]
  expectedSeedArray[62] = expectedSeedArray[14]
  expectedSeedArray[63] = expectedSeedArray[14]
  expectedSeedArray[64] = expectedSeedArray[16]
  expectedSeedArray[65] = expectedSeedArray[16]

//console.log(expectedSeedArray[10][3])
return expectedSeedArray;

}

////////////////////////////////////////////////
function get_tabs_winners_array (tabName){
////////////////////////////////////////////////
//Returns 2D array of tab's winners.

//starts at index 3 so the columns line up nicely
//the 'unshifts' puts 2 blanks in the beginning, so the rows line up.
//Then you can easily access by [COLUMN][ROW] in relation to the spreadsheet view.

  var app = SpreadsheetApp;
  var bracketsSS = app.getActiveSpreadsheet();
  var activeSheet = bracketsSS.getSheetByName(tabName);
  
  var winnersArray = [[]]
  winnersArray[3] = activeSheet.getRange("C2:C65").getValues();
  winnersArray[3].unshift("")
  winnersArray[3].unshift("")
  winnersArray[5] = activeSheet.getRange("E2:E65").getValues();
  winnersArray[5].unshift("")
  winnersArray[5].unshift("")
  winnersArray[7] = activeSheet.getRange("G2:G65").getValues();
  winnersArray[7].unshift("")
  winnersArray[7].unshift("")
  winnersArray[9] = activeSheet.getRange("I2:I65").getValues();
  winnersArray[9].unshift("")
  winnersArray[9].unshift("")
  winnersArray[11] = activeSheet.getRange("K2:K65").getValues();
  winnersArray[11].unshift("")
  winnersArray[11].unshift("")
  winnersArray[13] = activeSheet.getRange("M2:M65").getValues();
  winnersArray[13].unshift("")
  winnersArray[13].unshift("")

  //console.log(winnersArray)

return winnersArray
}

//////////////////////////////////
function get_sheet_names() {
//////////////////////////////////
//return list of just the player sheet names.  
//Removes the standard sheets in the spreadshsset
  var out = new Array()
  var sheets = SpreadsheetApp.getActiveSpreadsheet().getSheets();
  for (var i=0 ; i<sheets.length ; i++) out.push( [ sheets[i].getName() ] )

  for(var i = 0; i<=4; i++){
    if(String(out[0]) === "FrontPage" || String(out[0]) === "Scoreboard" || String(out[0]) === "Master"){
      out.splice(0,1);
    }
  }
  return out 
}

function get_peoples_tab_name_array (entriesAmount) {
/////////////////////////
//Using the scoreboard sheet, fill a key:value array with <tabname>:<record number>. Then you can know the row for 'jason' to fill in data.
/////////////////////////
  
  var app = SpreadsheetApp;
  var bracketsSS = app.getActiveSpreadsheet();
  var activeSheet = bracketsSS.getSheetByName("Scoreboard");
  var row=4;

  var scoreboardTabnameArray = {};

  for (row=4; row <=entriesAmount + 3; row++){
  scoreboardTabnameArray[String(activeSheet.getRange(row,5).getValue())] = row
  }

  //console.log(scoreboardTabnameArray);

return scoreboardTabnameArray;
}


////////////////////////////////////////////
function reorder_sheets(){
//////////////////////////////////////////
//re-order sheets in the spreadsheet

  var app = SpreadsheetApp;
  var bracketsSS = app.getActiveSpreadsheet();
  
  var activeSheet = bracketsSS.getSheetByName("Scoreboard");
  var tabScoreOrder = activeSheet.getRange("E4:E50").getValues()
  


  for(var i=0; i<tabScoreOrder.length; i++){
    //trim off empty rows
    if (tabScoreOrder[i] == ""){
      tabScoreOrder.splice(i,1)
      i = i - 1
    }
    else {
      //console.log("moving sheet: " + String(tabScoreOrder[i]) + "to position: " + (i+3))
      bracketsSS.setActiveSheet(bracketsSS.getSheetByName(String(tabScoreOrder[i])));
      bracketsSS.moveActiveSheet(i+3);
    }
  }
  bracketsSS.setActiveSheet(bracketsSS.getSheetByName("Master"))
  bracketsSS.moveActiveSheet(2);
  bracketsSS.setActiveSheet(bracketsSS.getSheetByName("Scoreboard"))
  bracketsSS.moveActiveSheet(2);
  
}

////////////////////////////////////
//move a sheet into live sheet
//////////////////////////////////////
function move_sheet_to_live(sheet_name){

  var stagingss = SpreadsheetApp.openByUrl('https://docs.google.com/spreadsheets/d/1pWMbywqnG2tfaN8LQO_LJwLUbAKk7IgHkVzyRWJQmS8/edit')
  var sheet = stagingss.getSheetByName(sheet_name);
  var livess = SpreadsheetApp.openByUrl('https://docs.google.com/spreadsheets/d/1TopFD2FuZ9MgGqiJ26frFdUv7raCWDQ-2qf1fiu7Kug/edit');
    
  sheet.copyTo(livess).setName(sheet_name);
  stagingss.deleteSheet(sheet)

}



function main(){

}
