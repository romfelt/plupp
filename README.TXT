PLUPP
=====

The multi-project multi-team resource planning and visualization tool. Written 
in php and javascript using jQuery, Moment.js and Flot chart libraries.

INSTALL
-------

Host requirements

* Written in php and relies on php-ldap library (php5-ldap on Ubuntu) for LDAP 
user account verification.
* Have support for MySQL database as backend but should be straightforward to 
add new SQL backend.
* phpmyadmin is not required but a nice tool for administration of MySQL server

Installation

1. Run: "sudo apt-get install mysqld php5-ldap phpmyadmin" to install 
dependencies. (Tested on Apache2 web server.)
2. Install files under your www-root, typically in a folder named "plupp"
3. Create a separate database and it is suggested to create a database user 
with insert- and select-capabilities only.
4. Edit config.php to set database user settings and PLUPP application
settings.
5. Run the php script called plupp-install.php to setup database tables.

DEVELOPER INFORMATION
---------------------

References

* https://jquery.com/
* http://momentjs.com/
* http://www.flotcharts.org/
* Icons "Flat Lines Circled", http://www.flaticon.com/authors/eleonor-wang, CC 3.0 BY