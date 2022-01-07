# New version of Tiddlywiki Builder

11th November 2021 at 9:34am

![](Tiddlywiki_Builder_new_version.png)

Several years I've been keeping my Tiddlywiki farm using own tools developed under project [TWFarm](https://protw.github.io/twfarm). For me it is a convenient way of managing my multiple projects in public and private *github*-space

For those who don't know, [Tiddlywiki](https://tiddlywiki.com/) is a portable versatile autonomous kind of wiki written with the use of *javascript* and capable to pack its both code and data in a single *HTML*-file.

The core of my Tiddlywiki farm management is Tiddlywiki Builder (*tw_builder*) - a small *javascript* written code. 

Finally I got my hands to redo *tw_builder*. The fact is that the experience of operating [tw_builder.js](https://github.com/protw/twfarm/blob/master/tw_builder.js) under *Node.js* showed the instability of its work with the local file system. The reasons for this instability have not been established. Therefore there was an idea to rewrite a script `tw_builder.js` on *Python*.

Rewriting the first version of the code on *Python v. 3.9.6* - [tw_builder.py](https://github.com/protw/twfarm/blob/master/tw_builder.py) (v. 3.0) took a few hours of work including debugging along 2 days. The code is located next to the previous *js*-version. Also *js*-code in the batch file [tw_builder.bat](https://github.com/protw/twfarm/blob/master/tw_builder.bat) is replaced by *py*-code:

```
REM node tw_builder.js
python tw_builder.py
```

So far, the first impressions are positive.