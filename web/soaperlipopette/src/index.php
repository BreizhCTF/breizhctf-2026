<?php 

if (!isset($_GET['bzh']) || $_GET['bzh'] != '1') {
    header('Content-Type: text/plain; charset=utf-8');
    readfile(__FILE__);
    exit;
}

new SoapClient($_GET[0] ?? null, $_GET[1] ?? null)->bzh();