# Free Magic


##What is Free Magic?

  Free Magic is a tool I created to draft Magic: The Gathering cards over the internet.  Using Socket.io to connect users, anywhere from 1-10 players can play a simulated Magic draft together.  [What is a booster draft?](http://magic.wizards.com/en/articles/archive/lo/basics-booster-draft-2014-11-03)
  
##Using Free Magic
![Into to Free Magic](https://raw.githubusercontent.com/HenryHall/Free-Magic/master/images/first.png)


The first player to arrive in the room is designated the "owner" and is granted the ability to choose the settings for the game.


![What Next?](https://raw.githubusercontent.com/HenryHall/Free-Magic/master/images/second.png)


Once all players have taken their seats and the settings are chosen, the room owner can start the draft.  The user icon on the bottom right side of the chat window shows each player and their status.


![Let the games begin!](https://raw.githubusercontent.com/HenryHall/Free-Magic/master/images/third.png)


Now that drafting has started, each player gets to see a single pack of cards at a time.  A player can pick a card out of a pack by clicking on a card once to signify that they are "thinking" about picking it.  A second click will confirm the card pick and move it from the current pack into their picked cards.


![Finishing Up](https://raw.githubusercontent.com/HenryHall/Free-Magic/master/images/fourth.png)


Once all three packs have been drafted, the deck construction windows will be displayed.  Players must decide how many basic lands they would like their deck to include.  Additionally, they must devide the cards they picked during the draft into their "mainboard", cards they would like to play with, and their "sideboard", cards that might be useful to add in for the second or third game against an opponent.  A card will move from mainboard to sideboard or vice versa by double clicking it.


![Submit!](https://raw.githubusercontent.com/HenryHall/Free-Magic/master/images/fifth.png)


Congratz!  You have just finished your first draft on Free Magic.  Now you can find out who your first opponent is and submit your deck.  Submitting your decklist will generate a hash for you and your opponents to see.  This used in conjunction with Cockatrice, an application for playing Magic once your deck has been built.  You can cross reference this hash with the one shown in Cockatrice to determine if your opponent is using the same deck that they drafted.

##Why isn't Free Magic live?

  I am not currently hosting Free Magic anywhere because although I would love Magic: the Gathering to be free, I must respect Wizards of the Coast's IP.  This application was a project for school and is not indented for any other use, sorry!
  
##How does it work?

  I created a Mongo database of every card to date using a JSON from MTGJSON.com.  Once the game loads, the names of the sets are sent to the room owner's client to be selected.  Once the sets are selected, the server checks the database for information used to search Wizard of the Coast's Gatherer database.  Once the packs of cards are randomized on my server, I am able to pull images from Gatherer.
