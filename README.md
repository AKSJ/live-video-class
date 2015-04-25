# Mummy Workouts

## Live video workout sessions

### Description

A service to provide live workouts in the home.  

The client sees a fullscreen video of the instructor, while the instructor sees five class members at the time, and can switch between them. 

### Installation 

1. `git clone` this repo
2. `npm install`
3. `touch api/creds.json` - see api/creds.json.example
4. `npm start`

### Service dependencies

1. [TokBox](https://tokbox.com/)
2. Mongodb (e.g. [mongolab](https://mongolab.com/)
3. [Facbook auth](https://developers.facebook.com/)

Keys to be stored in api/creds.json or as process.env variables, e.g. on Heroku.
See api/config.js for environment variable names.

### User flow

All users visit the root domain and login using Facebook.

The view served depends on the users permission level. New users are automatically added with standard permissions ('publisher'). Other permissions levels can be set by any 'administrator'.

Possible permissions levels are:
1. Publisher
2. Moderator
3. Administrator
4. Unauthorised

*NB* All users will be presented with a browser prompt after login, requesting permission to use the camera and microphone. Users should choose 'allow'.

*NB* The intended flow for all users is to close the browser/tab when finished. There is no need to log out. Moderators should first press the *end class* button.

#### Publisher

The service client view.

The user:
* sees a full page video of the instructor, with sound.
* sees their outgoing video in a small overlay in the bottom right corner.
* sees 3 buttons below their outgoing video.
* can press the red 'camera button to stop steaming to the instructor (toggles to green, to restart steam).
* can press the blue 'question mark' button for a help pop-up.
* can press the orange 'log out' button to log out.
* can use the 'speaker' button at the top right of the instructor video to mute the instructor.
* can use the 'microphone' button at the top right of their outgoing video to mute herself. 

The user will be visible to the instructor if their outgoing stream is enabled, but *not* to any other clients with publisher permissions.

The user can be heard by the instructor if they are currently being viewed by the instructor, and the instructor has clicked on them.

*NB* When the client has finished their workout they should then close the browser/tab. There is no need to log out.

#### Moderator

The service instructor view.

The user:
* sees their outgoing video in the top left of the screen.
* can see up to five clients at a time (two rows of three videos, with the instructor always top left).
* sees 6 buttons at the bottom of their view.
* can press the blue right/left arrow buttons to view the next/previous five clients.
* can press the green 'list' button to see a pop-up list of all clients viewing the class. This includes clients not currently visible to the instructor (i.e. not currently streaming).
* can press the red 'kick' button on the list pop-up to kick a selected client from the class.
* can press the blue 'question mark' button for a help pop-up.
* can press the orange 'log out' button to log out.
* can press the red 'end class' button to end the class, disconnecting all clients and herself.
* can use the 'speaker' button at the top right of the their outgoing video to mute herself. 
* can click on any clients video box to hear their sound output. (*NB* clients start muted by default).

The user will be visible to all other users, and cannot choose to disable their stream.

The user can be heard by all other users, unless she has muted herself.

*NB* It is intended that the instructor click the 'end class' button when they have finished a workout session. This will disconnect all users, and help to avoid unwanted streaming fees. They should then close the browser/tab. There is no need to log out.

#### Administrator

The service administrator view.

The user:
* sees 2 tabs - Member view and Class View.
* sees a navbar with a 'log out' button.

On member view:
* sees a table of all users signed up for the service, with username, email and permissions level.
* can change the permission level of any user. Setting a user to 'unauthorised' will prevent them accessing the service.

On class view:
* Sees copy of the Publisher view, with all functionality intact. This can be used to audit classes in progress.

The user will interact with any current workout session in exactly the same way as a publisher. As such:

The user can see the instructor, but not any other publisher.

The user will be visible to the instructor if their outgoing stream is enabled, but *not* to any other clients with publisher permissions.

The user can be heard by the instructor if they are currently being viewed by the instructor, and the instructor has clicked on them.

*NB* If the administrator doesn't wish to be seen by any current class instructor, they can choose 'deny' at the camera and microphone prompt on login, or press the red 'camera' button in the class view.

*NB* When the administrator has finished they should then close the browser/tab. There is no need to log out.

#### Unauthorised

The banned user view.

The user:
* will see an error message 'unauthorised user'.

The user cannot see any one else, or be seen by anyone else.




