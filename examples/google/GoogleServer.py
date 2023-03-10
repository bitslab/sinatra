import time
from http.server import BaseHTTPRequestHandler, SimpleHTTPRequestHandler
from queue import Queue
import socketserver
import urllib
import requests
import io

hostName = "localhost"
response_queue = Queue()


class MyServer(SimpleHTTPRequestHandler):

    def do_GET(self):
        if '/search' not in self.path:
            SimpleHTTPRequestHandler.do_GET(self)
            return



        print(f' here:  https://www.google.com{self.path}')
        print('here')
        print(self.headers)
        req_headers = dict(self.headers)
        req_headers['Host'] = 'google.com'
        req_headers['Referer'] = 'https://google.com'
        response = requests.get(f'https://www.google.com{self.path}', headers=req_headers, verify=False)

        self.send_response(response.status_code)
        for key, val in response.headers.items():
            self.send_header(key, val)
        self.end_headers()
        print('content')
        print(response.content)
        self.wfile.write(response.content)

    def do_POST(self):
        if '/search' not in self.path:
            SimpleHTTPRequestHandler.do_GET(self)
            return

        response = requests.post(f'https://www.google.com{self.path}', verify=False)
        print(response.text)


with socketserver.TCPServer(("", 8000), MyServer) as httpd:
    print("serving at port", 8000)
    httpd.serve_forever()

