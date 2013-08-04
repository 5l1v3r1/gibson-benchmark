Gibson cache server benchmark utility.
========================

A non-blocking benchmark utility for Gibson cache server.

<http://gibson-db.in/>
<http://www.evilsocket.net/>

Command Line Options
----------

    --help      Show the help menu and exit.                                     
    --dns       The connection string, default is unix:///var/run/gibson.sock.   
    --clients   The number of concurrent clients to use, default is 50.          
    --requests  The number of total requests to send per client, default 10000.  
    --timeout   Socket milli seconds timeout, default to 0 ( no timeout ).       
    --pre       The list of operations to execute before running the benchmark separated by ";", default is "SET 0 foo bar".
    --operator  The operator to benchmark, default is "GET foo"   

Examples
------

Simply benchmark a 'GET foo' operation with 50 concurrent clients, each one executing 10000 operations:
    
    node benchmark.js

Connect to a local tcp Gibson instance using a 100ms timeout:

    node benchmark.js --dns "tcp://127.0.0.1:10128" --timeout 100

Benchmark the PING operator:

    node benchmark.js --operator PING

Create two keys to benchmark the MGET operator:

    node benchmark.js --pre 'SET 0 bench:a hello; SET 0 bench:b world' --operator 'MGET bench'

License
---

Released under the BSD license.  
Copyright &copy; 2013, Simone Margaritelli <http://www.evilsocket.net/>  
All rights reserved.
