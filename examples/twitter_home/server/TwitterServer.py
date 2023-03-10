import socketserver
from http.server import SimpleHTTPRequestHandler
import ssl
from queue import Queue

hostName = "localhost"
response_queue = Queue()

import logging
import time

logging.basicConfig(level=logging.DEBUG)


class TwitterServer(SimpleHTTPRequestHandler):

    # def do_GET(self):
    #     self.send_header('Access-Control-Allow-Origin', 'https://localhost')
    #     SimpleHTTPRequestHandler.do_GET(self)

    def address_string(self):
        """ Override address_string() with a version that skips the
            reverse lookup.

        """
        return '%s:%s' % self.client_address

    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', 'https://127.0.0.1')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS')
        self.send_header('Access-Control-Allow-Credentials', 'true')
        self.send_header('Access-Control-Allow-Headers', 'authorization, x-csrf-token, x-twitter-active-user, x-twitter-auth-type, x-twitter-client-language')
        SimpleHTTPRequestHandler.end_headers(self)

    def do_POST(self):
        self.send_response(200)
        # self.send_header('Access-Control-Allow-Origin', 'https://localhost')
        # self.send_header('Access-Control-Allow-Credentials', 'true')
        self.send_header('content-length', '0')
        self.end_headers()

    def do_PUT(self):
        self.send_response(200)
        # self.send_header('Access-Control-Allow-Origin', 'https://localhost')
        # self.send_header('Access-Control-Allow-Credentials', 'true')
        self.send_header('content-length', '0')
        self.end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        # https://stackoverflow.com/questions/39286997/google-chrome-a-wildcard-cannot-be-used-in-the-access-control-allow-origin
        # self.send_header('Access-Control-Allow-Origin', 'https://localhost')
        # self.send_header('Access-Control-Allow-Credentials', 'true')
        self.end_headers()


port = 443
with socketserver.TCPServer(("", port), TwitterServer) as httpd:
    print('PEM pass phrase: password')
    httpd.socket = ssl.wrap_socket(httpd.socket, server_side=True, certfile='cert/twitter.com+5.pem',
                                   keyfile='cert/twitter.com+5-key.pem',
                                   ssl_version=ssl.PROTOCOL_TLS)

    print("serving at port", port)
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        httpd.shutdown()
        httpd.server_close()
        exit(0)

