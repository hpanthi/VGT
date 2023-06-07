/**
 * This file is part of the Virtual Game Table distribution 
 * Copyright (c) 2015-2021 Jack Childress (Sankey).
 * 
 * This program is free software: you can redistribute it and/or modify  
 * it under the terms of the GNU General Public License as published by  
 * the Free Software Foundation, version 3.
 *
 * This program is distributed in the hope that it will be useful, but 
 * WITHOUT ANY WARRANTY; without even the implied warranty of 
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU 
 * General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License 
 * along with this program. If not, see <http://www.gnu.org/licenses/>.
 */


// Everything about the current game state
var state = {
  slots      : 32,          // Maximum number of clients
  max_name_length: 25,      // Maximum number of characters in each player's name
  clients    : {},          // List of client data
  pieces     : {},          // List of piece properties
  nameplates : {},          // List of nameplate properties
  hands      : {},          // List of hand properties
  t_simulated_lag : 0,      // Simulated lag when routing packets. Be careful with this; this asynchronous nature causes some confusion.
  t_full_update   : 3000,   // How often to send a full update
}; 

// State keys that should not be set by clients with server commands (/set)
var state_keys_no_set = [
  'clients', 
  'pieces', 
  'nameplates',
  'hands',
  'slots',
  'max_name_length',
];



///////////////////////////////////////////////// EXTERNAL LIBRARIES

// Versions included in external_scripts
pixi_version      = 'pixi.min.js';
howler_version    = 'howler.min.js';

// Requirements to be installed by npm
var fs   = require('fs');                     // file system stuff
var express  = require('express');              // routing handler
var app = express();
var http = require('http').createServer(app); // listening
var io   = require('socket.io')(http);        // fast input/output
var fun  = require('./common/fun');           // My common functions
var user = require('./common/user')
const QRCode = require('qrcode')



// Set EJS as templating engine
app.set('view engine', 'ejs');
app.use(express.static(__dirname));
// port upon which the server listens
fun.log_date('');
fun.log_date('Arguments:');
for(var n in process.argv) fun.log_date(process.argv[n]);


// find out if a game name and port was supplied
game_name = process.argv[2];
port      = parseInt(process.argv[3]);

if(game_name == '0') game_name = 'chess';
if(port      ==  0 ) port      = 38000;

// get the directories
var root_directory = process.cwd();

// This is the order of searching for files.
var private_directory  = root_directory + '/private/'  + game_name
var games_directory    = root_directory + '/games/'    + game_name;
var common_directory   = root_directory + '/common';

// change to the root directory
fun.log_date('');
fun.log_date('Search Order:');
fun.log_date('  '+private_directory);
fun.log_date('  '+games_directory);
fun.log_date('  '+common_directory);
fun.log_date('  '+root_directory+'\n');

/**
 * See if the full path exists.
 * @param {string} path 
 */
function file_exists(path) { return fs.existsSync(path); }

/**
 * Returns the path to the appropriate file, following the priority
 * private_directory, games_directory, common_directory
 */
function find_file(path) {
  //fun.log_date(' Searching for', path, 'in');
  var paths = [
    private_directory +'/'+path,
    games_directory   +'/'+path,
    common_directory  +'/'+path,
    root_directory    +'/'+path
  ] 
  
  for(var n in paths) {if(file_exists(paths[n])) return paths[n];}

  fun.log_date('  FILE NOT FOUND:', path);
  return common_directory+'/images/nofile.png';
}

/**
 * Searches for the path, and, if found, sends it using the response object
 * @param {response} response
 * @param {path-like string} path 
 */
function send_file(response, path) {
  var full_path = find_file(path);
  fun.log_date('  Sending ', full_path);
  if(full_path) response.sendFile(full_path);
}





///////////////////
// FILE REQUESTS //
///////////////////

// Required engine scripts
app.get('/pixi.js',          function(q, a) { a.sendFile(root_directory + '/external_scripts/' + pixi_version); } );
app.get('/pixi.min.js.map',  function(q, a) { a.sendFile(root_directory + '/external_scripts/' + pixi_version + '.map'); } );
app.get('/howler.js',        function(q, a) { a.sendFile(root_directory + '/external_scripts/' + howler_version); } );
app.get('/socket.io.js',     function(q, a) { a.sendFile(root_directory + '/node_modules/socket.io/client-dist/socket.io.js'); } );
app.get('/socket.io.js.map', function(q, a) { a.sendFile(root_directory + '/node_modules/socket.io/client-dist/socket.io.js.map'); } );

// General files, following the above search order (private/game/, games/game/, common/)
app.get('/',                 function(q, a) { send_file(a, 'index.html'                                           );} );
app.get('/:a',               function(q, a) { send_file(a, q.params.a                                             );} );



app.get('/scan/qr', (req, res) => {
 
  // The render method takes the name of the HTML
  // page to be rendered as input
  // This page should be in the views folder
  // in the root directory.
  const url = `http://192.168.1.5:${port}/api/redirect`
  //let stringdata = JSON.stringify(url)
  QRCode.toDataURL(url, function (err, code) {
    if(err) return console.log("error occurred in QR code")

    res.render('user', {QR : code})
})
  //res.render('home', {QR : "qr code"});

});


app.get('/api/redirect', (req, res) =>{
  last_id++;
  const url = `http://192.168.1.5:${port}/api/users/${last_id}`
  res.redirect(url)
});


app.get('/api/users/:id', (req, res) => {
    id = parseInt(req.params.id);
    if(id == NaN || id > 8)
      res.send("<p>Invalid input</p>");
    else{
      userData = user[id]
      fun.log(user[id].cards[0]) 
      //userData = user.userArray[id]
      res.render('home', {user : userData})
    }
});

app.get('/:a/:b',            function(q, a) { send_file(a, q.params.a+'/'+q.params.b                              );} );
app.get('/:a/:b/:c',         function(q, a) { send_file(a, q.params.a+'/'+q.params.b+'/'+q.params.c               );} );
app.get('/:a/:b/:c/:d',      function(q, a) { send_file(a, q.params.a+'/'+q.params.b+'/'+q.params.c+'/'+q.params.d);} );


////////////////////////////
// Lag simulator
////////////////////////////

/**
 * Routes the supplied data to the supplied handler function after a delay.
 * @param {function} handler // Function that receives the data after state.t_simulated_lag
 * @param {*} data           // Incoming data.
 */
function delay_function(handler, data) {

  // If we have a simulated lag, delay the handling of this data
  // Note I think it would be a bad simulation if we allow this lag to vary here,
  // because this would re-order the data, which is ensured to be in order by the TCP 
  // protocol.
  if(state.t_simulated_lag) setTimeout(function(){handler(data)}, state.t_simulated_lag);
  
  // Otherwise, just run the handler on the data.
  else handler(data);
}

/**
 * Emits the data on the supplied socket with the supplied key, after a delay (if not zero).
 * @param {socket} socket 
 * @param {String} key 
 * @param {*} data 
 */
function delay_send(socket, key, data) {
  if(socket) {
    // Note we do the stringify-parse to create a COPY of the object, so when it sends, it sends the data
    // as it is in this moment.
    if(state.t_simulated_lag) setTimeout(function(){
      socket.emit(key, JSON.parse(JSON.stringify(data)))}, state.t_simulated_lag);
    else                                            
      socket.emit(key, data);
  }
}

/**
 * Special case: for sending clients, we have to attach the socket id for everyone.
 */
function delay_send_clients_to_all() {

  // Loop over all the client ids (should match socket ids)
  for (id in sockets) delay_send(sockets[id], 'clients', [id, state.clients]);
}



///////////////////////////////////////////
// Thread for what to do with new client //
///////////////////////////////////////////

var sockets     = {}; // Socket objects, sorted by id
var last_id     = 1;  // Last assigned id; incremented with each client

// Names for new players
var first_names = ['James T.', 'Billy D.', 'Johnny', 'Susan B.', 
                   'Karen', 'Claudia', 'Beatrice Q.', 'Mr.', 'Ms.', 
                   'Mrs.', 'Dr.', 'Prof.', 'M.', 'Mme.', 'Mlle.']

var last_names_1 = ['Pants', 'Silly', 'Fancy', 'Dirt', 'Goofy', 'Hella',
                     'Trash', 'No', 'Awful', 'Nono', 'Juicy', 'Gnasty'];
var last_names_2  = ['tastic', 'cakes', 'pants', 'face', 'juice', 
                     'bag', 'hole', 'friends', 'skillet', 'billy',
                     'chunks', 'dirt', 'mouth'];






// When a client connects
io.on('connection', function(socket) {
  fun.log("client connected");
  // Make sure we have a clients list
  if(!state.clients) state.clients = {};

  // Make sure the clients list is not too large
  if(Object.keys(state.clients).length > state.slots) {
    socket.disconnect();
    return;
  }
  

  /** 
   * My own function that sends the supplied data to everyone else; 
   * socket.broadcast.emit is not working. 
   */
  function broadcast(key, data) { for (id in state.clients) if(id != socket.id) delay_send(sockets[id], key, data); }

  // Put the id somewhere safe, and use this id to update the master sockets list
  socket.id = last_id++;
  sockets[socket.id] = socket;

  // Add a new client to the list
  state.clients[socket.id] = {
    'id'     : socket.id, 
    'name'   : fun.random_array_element(first_names) + ' ' + fun.random_array_element(last_names_1)+fun.random_array_element(last_names_2),
    'team'   : 0,
  };
  fun.log_date('CLIENT', socket.id, 'CONNECTED');
  
  // Summarize existing state.clients
  for(n in state.clients) fun.log_date(' ', n, state.clients[n]);



  ////////////////////////////
  // Queries sent by client
  ////////////////////////////

  // Client says hello, asks for game state.
  function on_hallo(data) {
    fun.log_date(socket.id, 'NETR_hallo', data);
    var name = data[0]; // string
    var team = data[1]; // integer
    
    // Update the client name
    if(name != '' && socket && state.clients) state.clients[socket.id].name = name;
    if(              socket && state.clients) state.clients[socket.id].team = team;

    // Send the state so the net.ready flag is good, then send clients.
    delay_send(socket, 'state', state);
    delay_send_clients_to_all();

    // Send a chat welcoming the new player
    delay_send(io, 'chat', [0, 'Welcome, ' + state.clients[socket.id].name + '!']);
  }
  socket.on('hallo', function(data) {delay_function(on_hallo, data)});


  // Team or name change from clients
  function on_clients(clients) {
    fun.log_date('NETR_clients_'+String(socket.id));

    // Limit the name length
    for(var k in clients) clients[k].name = clients[k].name.substr(0,state.max_name_length);

    // Make sure there's something
    if(!clients[k].name.length) clients[k].name = fun.random_array_element(first_names) + ' ' + fun.random_array_element(last_names_1)+fun.random_array_element(last_names_2)

    // Update the clients list
    if(clients) state.clients = clients;
    else fun.log_date('  ERROR: no clients provided!');

    // Clear out the nameplate & hand data
    state.nameplates = {};
    state.hands      = {};

    // Remind of the id and send the clients list
    delay_send_clients_to_all();
  }
  socket.on('clients', function(data) {delay_function(on_clients, data)});



  // received a chat message
  function on_chat(message) {
    // Truncate
    if(message.length > 1000) message = message.slice(0,1000);
    
    fun.log_date(socket.id, 'Received-chat:', socket.id, state.clients[socket.id].name, message);

    // If the message starts with "/" it's a server command
    if(message[0]=='/') {

      // Split it by space
      var s = message.split('%20');

      // Special commands
      /*if(s[0] == '/boot') {

        // Find the client by name and boot them
        for(var id in state.clients) if(state.clients[id].name == s[1]) {
          delay_send(io, 'chat', [0, 'Booting ' + s[1] + '.']);
          sockets[id].emit('yabooted');
          sockets[id].disconnect(true);
        }
      }*/

      // Set a variable NEEDS A REVIEW / REDESIGN SINCE SO MUCH HAS CHANGED!
      if(s[0] == '/set') {

        // If the variable is in the state and we're allowed to set it, and we supplied a value
        if(state[s[1]] != undefined && !state_keys_no_set.includes(s[1]) && s.length==3) {
        
          // Update
          state[s[1]] = parseFloat(s[2]);
          fun.log_date('VARIABLE '+s[1]+' SET TO '+String(state[s[1]]));
          delay_send(socket, 'chat', [0,'Server variable '+s[1]+' set to '+String(state[s[1]])]);
        }

        // Send the current settings.
        else {
          s = 'OPTIONS: ';
          for(var key in state) if(!state_keys_no_set.includes(key)) s = s + key + '=' + state[key]+', ';
          delay_send(socket, 'chat', [0,s.slice(0,s.length-2)]);
        }
      }
    } // end of "message starts with /"

    // Send a normal chat
    else delay_send(io, 'chat', [socket.id, message]);
  }
  socket.on('chat', function(data) {delay_function(on_chat, data)});

  // Someone kills everyone's undos
  function on_kill_undos(data) { 
    fun.log_date('NETR_kill_undos');
    delay_send(io, 'kill_undos');
  }
  socket.on('kill_undos', function(data) {delay_function(on_kill_undos, data)});

  // Client has sent a list of z moves of the form [id,z,id,z,id,z,...]
  function on_z(data) { fun.log_date('NETR_z_'+String(socket.id), data.length/2); 

    var id_piece, c, l, zi, zf;

    // Loop over the entries
    for(var n=0; n<data.length; n+=2) {

      // Unpack
      id_piece = data[n];
      c        = state.pieces[id_piece] // existing state piece data
      if(!c) continue;                  // Only happens if someone has the wrong number of pieces compared to the server.
      l        = c['l'];                // Layer (uploaded by the first client, guaranteed to exist here)
      zi       = c['z'];                // Initial z-position (uploaded by the first client, guaranteed to exist here)
      zf       = data[n+1];             // Final z-position
      

      // If zf > zi 
      //   p.z < zi         no change
      //   p.z == zi        set to zf
      //   zi < p.z <= zf   subtract one
      //   p.z > zf         no change
      
      // If zi > zf
      //   p.z < zf         no change
      //   zf <= p.z < zi   add one
      //   p.z == zi        set to zf
      //   p.x > zi         no change

      // Now that we have the zi and zf, loop over the state pieces, updating the z's of those in the layer.
      var p;
      for(var i in state.pieces) if(l == state.pieces[i]['l']) { p = state.pieces[i];

        // Do different numbering depending on where the z is relative to the initial and final values.
        
        // No matter what, if the z matches the initial z, this is the one to set
        if(p.z == zi) { p.z = zf; }
        
        // If zf > zi, we're moving it up in z order, so the middle numbers shift down.
        else if(zi < p.z && p.z <= zf) { p.z--; }

        // If zi > zf, we're moving it lower, so the middle numbers shift up
        else if(zf <= p.z && p.z < zi) { p.z++; }
      }

    } // End of loop over entries

    // Relay this move to everyone, including the sender (who is waiting for the ok to actually move z).
    delay_send(io, 'z', data);
  }
  socket.on('z', function(data) {delay_function(on_z, data)});

  /**
   * Loops over the q, determines whether to update the state or the q (IN PLACE), and returns the q to send to everyone else
   * @param {Object} q          Incoming q object, e.g. q_pieces
   * @param {Object} state_list Associated state object, e.g. state.pieces
   */
  function handle_q_in(q, state_list) {
    var k, update_server_state; // Flag to reuse below

    // Note that z information should never be sent by the users through this channel.
    // It's sent separately to make it faster responding.

    // Loop over the incoming pieces q by id.
    for(var id in q) { 

      // Make sure we have a place to hold the data in the global list
      if(!state_list[id]) state_list[id] = {};

      // Housekeeping: If there is a left over holder id from a non-existent client, kill it.
      if( state_list[id]['ih'] // If there is a holder id
      && !Object.keys(sockets).includes(String(state_list[id]['ih'])) ) { // And that client is gone
        delete state_list[id]['ih'];
        delete state_list[id]['Nih'];
      } // End of missing holder cleanup

      // If no one is holding it (0 or undefined) OR the holder is this client, 
      // set a flag to update the server state for this piece
      // Otherwise, we update the incoming q state with that of the server
      update_server_state = !state_list[id]['ih'] || state_list[id]['ih'] == socket.id;    

      // Loop over attributes and transfer to or from the server state, depending on who is holding the piece
      // Note the input queue (q) from clients should never carry 'N' data; this is tracked and sent by the server
      for(k in q[id]) {
        if(k[0] == 'N') throw 'WHUT??'
        
        // Flag to send along with everything to make sure the end users know to update things immediately
        if(k == 'now') continue; // On to the next key
        
        // Make sure there is a packet number for this property
        // This is tracked by the server to remove ambiguity about the order of things.
        if(state_list[id]['N'+k] == undefined) state_list[id]['N'+k] = 1;

        // If it is valid to update the server state for this piece
        if(update_server_state) state_list[id][k] = q[id][k];
        
        // Otherwise overwrite the q entry
        else q[id][k] = state_list[id][k];

        // Increment the update number for this property, even if we rejected the change
        // This helps prevent a stuck out-of-state situation where one client has a higher 
        // estimated update number than the server.
        state_list[id]['N'+k]++;

        // In any case, always update the outbound packet with the update number
        q[id]['N'+k] = state_list[id]['N'+k];

      } // end of corrective loop over attributes
    } // end of loop over pieces
  }

  // Client has sent a q of changes
  // This should not contain z information, since that's via a separate, faster q.
  function on_q(data) { fun.log_date('NETR_q', Object.keys(data[0]).length, Object.keys(data[1]).length, Object.keys(data[2]).length);
    var q_pieces     = data[0];
    var q_hands      = data[1];
    var q_nameplates = data[2];
    var q_sounds     = data[3];
    
    // Handle the piece-like q's
    handle_q_in(q_pieces,     state.pieces);
    handle_q_in(q_hands,      state.hands);
    handle_q_in(q_nameplates, state.nameplates);
    
    // Can't broadcast (leads to unsync)
    delay_send(io, 'q', [q_pieces, q_hands, q_nameplates]);

    // For sounds we broadcast just to others (no need for us to hear it again!)
    if(q_sounds.length) broadcast('sounds', q_sounds);
  }
  socket.on('q', function(data) {delay_function(on_q, data)});

  // handle the disconnect
  function on_disconnect(data) {
    
    // Get the id asap before it disappears (annoying)
    var id = socket.id;
    fun.log_date(id, "disconnecting.", data);
    
    // Delete the client data. Socket will delete itself
    if(state.clients) delete state.clients[id];  

    // Delete the socket from the list
    if(sockets[id]) delete sockets[id];

    // tell the world!
    delay_send_clients_to_all();
    //delay_send(io, 'clients', state.clients);
  }
  socket.on('disconnect', function(data) {delay_function(on_disconnect, data)});

}); // end of io.on('connection')



// Send a full update to everyone, excluding recently touched pieces
function send_full_update() { 
   
  // Send the queue if any sockets exist.
  if(Object.keys(sockets).length) {
    fun.log_date('send_full_update()', Object.keys(sockets).length, 'sockets', Object.keys(state.pieces).length, 'pieces');

    // Hold dynamics require some thought. This is a "housekeeping" update to handle packet loss, but 
    // hold (and z) are locked to the server. Hold, however, has some latching behavior to keep 
    // local reality seeming snappy. These housekeeping events can interrupt this
    //
    // Basically, let the hold dynamics figure themselves out. Make a copy of each list and 
    // remove the ih & Nih so it's not set by the clients.
    //
    // JACK: this might lead to a stuck hold piece. But the person who's holding it could click again to 
    // release it, or reload the page (server will housekeep old holds away.)
    // Ideally, we should probably have Nih only come with full updates and have the user
    // check this and maybe a timeout, though this leads to async!
    var pieces = JSON.parse(JSON.stringify(state.pieces));
    var plates = JSON.parse(JSON.stringify(state.nameplates));
    for(var id in pieces) {delete pieces[id].ih; delete pieces[id].Nih;}
    for(var id in plates) {delete plates[id].ih; delete plates[id].Nih;}

    // including hands not needed, including nameplates leads to confusion on reloads with any net delay.
    // We make copies in case we're doing a delay send, so the state doesn't change!
    // Hands vanish and we don't want them to keep pulsing.
    delay_send(io, 'q', [pieces, {}, plates, true]); // true means "full update"; used so far for z stuff.
  }

  // Start the next full update
  setTimeout(send_full_update, state.t_full_update);

}; send_full_update(); // end / launch of send_full_update()


// actually start listening for requests
http.listen(port, function() {
  fun.log_date('listening on port '+String(port));
});
