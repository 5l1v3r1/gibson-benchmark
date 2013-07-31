/*
 * Copyright (c) 2013, Simone Margaritelli <evilsocket at gmail dot com>
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *
 *   * Redistributions of source code must retain the above copyright notice,
 *     this list of conditions and the following disclaimer.
 *   * Redistributions in binary form must reproduce the above copyright
 *     notice, this list of conditions and the following disclaimer in the
 *     documentation and/or other materials provided with the distribution.
 *   * Neither the name of Gibson nor the names of its contributors may be used
 *     to endorse or promote products derived from this software without
 *     specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
 * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
 * ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE
 * LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
 * CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
 * SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
 * INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
 * CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 * ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 * POSSIBILITY OF SUCH DAMAGE.
 */
var Gibson = require('gibson-client');
var Protocol = require('gibson-client/lib/protocol').Protocol;
var Optimist = require('optimist');

var argv = Optimist.usage( 'Gibson benchmark utility.', {
    'help': {
        description: 'Show the help menu and exit.',
        boolean: true,
        short: 'h'
    },
    'dns': {
        description: 'The connection string, default is unix:///var/run/gibson.sock.',
        boolean: false,
        short: 'd'
    },
    'clients': {
        description: 'The number of concurrent clients to use, default is 50.',
        boolean: false,
        short: 'c'
    },
    'requests': {
        description: 'The number of total requests to send per client, default 10000.',
        boolean: false,
        short: 'r'
    },
    'timeout': {
        description: 'Socket milli seconds timeout, default to 0 ( no timeout ).',
        boolean: false,
        short: 't'
    },
    'key': {
        description: 'The key to create before running the benchmark, default is "foo".',
        boolean: false,
        short: 'k'
    }, 
    'value': {
        description: 'The value to use for --key argument, default is "gibsoniscool".',
        boolean: false,
        short: 'v'
    },  
    'operator': {
        description: 'The operator to benchmark, default is "GET foo"',
        boolean: false,
        short: 'o'
    }
}).argv;

if( argv.h || argv.help ){
    Optimist.showHelp();
    process.exit(0);
}   

var ctx = {};

ctx.dns         = argv.dns      || argv.d || 'unix:///var/run/gibson.sock';
ctx.nclients    = argv.clients  || argv.c || 50;
ctx.timeout     = argv.timeout  || argv.t || 0;
ctx.clients     = [];
ctx.requests    = argv.requests || argv.r || 10000;
ctx.create      = argv.key      || argv.k || 'foo';
ctx.value       = argv.value    || argv.v || 'gibsoniscool';
ctx.operator    = argv.operator || argv.o || 'GET foo';
ctx.rps         = 0.0;
ctx.io_errors   = 0;
ctx.repl_errors = 0;
ctx.done        = 0;
ctx.timeouts    = 0;
ctx.running     = 0;
ctx.started     = 0;
ctx.finished    = 0;
ctx.ellapsed    = 0;
ctx.total       = ctx.nclients * ctx.requests;

var split = ctx.operator.split(' ');

ctx.opname   = split.shift();
ctx.argv     = split;

if( ( ctx.opname in Gibson.Client.prototype ) == false ){
    console.log( 'Unknown operator "' + ctx.opname + '", use --help to show the help menu.' );
    process.exit(1);
}

ctx.opcode = Protocol.commands[ ctx.opname.toUpperCase() ];
ctx.args   = ctx.argv.join(' ');

for( var i = 0; i < ctx.nclients; i++ ){
    var client = new Gibson.Client( ctx.dns, ctx.timeout );

    client.on( 'connect', do_benchmark );

    client.on( 'error', function(e){
        ctx.io_errors++;
        ctx.running--;
        check_end_condition();
    });

    client.on( 'timeout', function(){
        ctx.timeouts++;
        ctx.running--;
        check_end_condition();
    });

    client.on( 'close', function(){
        ctx.running--;
        check_end_condition();
    });

    ctx.clients.push(client);
}

process.stdout.write( 'Benchmark running ... ' );

ctx.started = new Date().getTime() / 1000;
ctx.running = ctx.nclients;

ctx.clients.forEach( function(client){
    client.connect();
});

function check_end_condition(){
    if( ctx.running <= 0 ){
        ctx.finished = new Date().getTime() / 1000;
        ctx.ellapsed = ctx.finished - ctx.started;

        console.log( 'Done.\n' );
        console.log( 'Ellapsed        : ' + ( ctx.ellapsed * 1000 ).toFixed(0) + ' ms' );
        console.log( 'Executed        : ' + ctx.done + ' / ' + ctx.total + ' ops' );
        console.log( 'Timeouts        : ' + ctx.timeouts );
        console.log( 'I/O Errors      : ' + ctx.io_errors );
        console.log( 'Data Errors     : ' + ctx.repl_errors );
        console.log( 'Requests/Second : ' + ( ctx.done / ctx.ellapsed ).toFixed(2) );

        process.exit(0);
    }
}

function do_benchmark(){
    var self = this;

    self.set( 0, ctx.create, ctx.value, function(e,d){
        var done = 0;

        for( var i = 0; i < ctx.requests; i++ ){
            self.query( ctx.opcode, ctx.args, function(e,d){
                if( e )
                    ctx.repl_errors++;
                else
                    ctx.done++;

                if( ++done == ctx.requests ){
                    self.close();
                }
            });
        }
    });
}
